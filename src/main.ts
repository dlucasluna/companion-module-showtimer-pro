import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import WebSocket, { type RawData } from 'ws'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import type { ShowTimerCommand, ShowTimerSet, ShowTimerState } from './types.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

type ServerInfo = {
	app?: string
	version?: string
	room?: string | null
	controllerConnected?: boolean
	state?: ShowTimerState | null
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	currentState: ShowTimerState | null = null
	room = ''

	private socket?: WebSocket
	private reconnectTimer?: ReturnType<typeof setTimeout>
	private ticker?: ReturnType<typeof setInterval>
	private destroyed = false
	private definitionsSignature = ''
	private clockOffset = 0
	private authenticated = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.destroyed = false
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.startTicker()
		this.connect()
	}

	async destroy(): Promise<void> {
		this.destroyed = true
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		if (this.ticker) clearInterval(this.ticker)
		this.closeSocket()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.currentState = null
		this.room = ''
		this.definitionsSignature = ''
		this.closeSocket()
		this.connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	getSetChoices(): Array<{ id: number; label: string }> {
		const sets = this.currentState?.sets || []
		if (sets.length) return sets.map((set) => ({ id: set.index, label: set.name || `Set ${set.index + 1}` }))
		return Array.from({ length: 8 }, (_, index) => ({ id: index, label: `Set ${index + 1}` }))
	}

	getMessageChoices(): Array<{ id: number; label: string }> {
		const messages = this.currentState?.messages || []
		if (messages.length)
			return messages.map((message) => ({
				id: message.index,
				label: message.text.length > 48 ? `${message.text.slice(0, 45)}...` : message.text,
			}))
		return [{ id: 0, label: 'Mensagem 1' }]
	}

	sendCommand(command: ShowTimerCommand): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			this.log('warn', 'ShowTimer Pro não está conectado')
			return
		}
		this.socket.send(JSON.stringify({ type: 'DIRECT_COMMAND', payload: command }))
	}

	getRemaining(): number {
		const timer = this.currentState?.timer
		if (!timer) return 0
		if (timer.state === 'running' && typeof timer.targetTimestamp === 'number')
			return Math.round((timer.targetTimestamp - (Date.now() + this.clockOffset)) / 1000)
		if (timer.state === 'paused' && typeof timer.pausedRemaining === 'number') return timer.pausedRemaining
		return (
			Number(
				timer.remainingSeconds ?? timer.idleRemaining ?? this.currentState?.remainingSeconds ?? timer.originalDuration,
			) || 0
		)
	}

	isNegative(): boolean {
		return this.getRemaining() < 0
	}

	isConnected(): boolean {
		return this.authenticated && this.socket?.readyState === WebSocket.OPEN
	}

	private connect(): void {
		if (this.destroyed) return
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		const host = String(this.config.host || '').trim()
		const port = Number(this.config.port) || 41730
		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Informe o IP do ShowTimer Pro')
			return
		}

		this.updateStatus(InstanceStatus.Connecting, `Conectando a ${host}:${port}`)
		try {
			this.socket = new WebSocket(`ws://${host}:${port}`)
		} catch (error) {
			this.handleConnectionError(error)
			return
		}

		this.socket.on('open', () => {
			this.authenticated = false
			this.updateStatus(InstanceStatus.Connecting, 'A validar o código de pareamento')
			this.socket?.send(
				JSON.stringify({
					type: 'MODULE_HELLO',
					payload: {
						module: 'showtimer-pro',
						name: 'Bitfocus Companion',
						version: '2.0.0',
						pairingCode: String(this.config.pairingCode || '').trim(),
					},
				}),
			)
		})
		this.socket.on('message', (data: RawData) => this.handleMessage(data))
		this.socket.on('error', (error) => this.log('debug', `WebSocket: ${error.message}`))
		this.socket.on('close', () => {
			if (this.destroyed) return
			this.authenticated = false
			this.updateStatus(InstanceStatus.ConnectionFailure, 'ShowTimer Pro offline')
			this.setVariableValues({ connection: 'offline' })
			this.scheduleReconnect()
		})
	}

	private handleMessage(data: RawData): void {
		let message: { type?: string; room?: string; payload?: unknown }
		try {
			message = JSON.parse(decodeRawData(data)) as { type?: string; room?: string; payload?: unknown }
		} catch {
			return
		}

		if (message.type === 'AUTH_OK') {
			this.authenticated = true
			this.updateStatus(InstanceStatus.Ok, 'Conectado ao ShowTimer Pro')
			this.setVariableValues({ connection: 'online' })
			this.socket?.send(JSON.stringify({ type: 'REQUEST_STATE', payload: {} }))
			this.checkAllFeedbacks()
			return
		}
		if (message.type === 'AUTH_ERROR') {
			this.authenticated = false
			this.updateStatus(InstanceStatus.BadConfig, 'Código de pareamento incorreto')
			this.log('warn', 'Ligação recusada. Confirme o código de 6 dígitos mostrado no ShowTimer Pro.')
			return
		}
		if (message.type === 'SERVER_INFO') {
			const info = (message.payload || {}) as ServerInfo
			if (info.room) this.room = info.room
			if (info.state) this.applyState(info.state)
			if (info.controllerConnected === false) {
				this.updateStatus(InstanceStatus.ConnectionFailure, 'Painel do ShowTimer Pro ainda não está pronto')
			} else {
				this.updateStatus(InstanceStatus.Ok, info.version ? `ShowTimer Pro ${info.version}` : 'Conectado')
			}
			this.refreshVariables()
			return
		}
		if (message.type === 'STATE_UPDATE' && message.payload) {
			if (message.room) this.room = message.room
			this.applyState(message.payload as ShowTimerState)
			return
		}
		if (message.type === 'COMMAND_RESULT') {
			const result = message.payload as { ok?: boolean; error?: string }
			if (result && result.ok === false) this.log('warn', `Comando rejeitado: ${result.error || 'erro desconhecido'}`)
		}
	}

	private applyState(state: ShowTimerState): void {
		this.currentState = state
		if (typeof state.serverTimestamp === 'number') this.clockOffset = state.serverTimestamp - Date.now()
		const signature = JSON.stringify({
			sets: (state.sets || []).map((set: ShowTimerSet) => [set.index, set.name]),
			messages: (state.messages || []).map((message) => [message.index, message.text]),
		})
		if (signature !== this.definitionsSignature) {
			this.definitionsSignature = signature
			this.updateActions()
			this.updateFeedbacks()
			this.updatePresets()
		}
		this.refreshVariables()
		this.checkAllFeedbacks()
	}

	private startTicker(): void {
		if (this.ticker) clearInterval(this.ticker)
		this.ticker = setInterval(() => this.refreshVariables(), 200)
		this.refreshVariables()
	}

	private refreshVariables(): void {
		const remaining = this.getRemaining()
		const absolute = Math.abs(remaining)
		const hours = Math.floor(absolute / 3600)
		const minutes = Math.floor((absolute % 3600) / 60)
		const seconds = absolute % 60
		const now = new Date(Date.now() + this.clockOffset)
		const sets = this.currentState?.sets || []
		const messages = this.currentState?.messages || []
		const activeSet = sets.find((set) => set.index === this.currentState?.activeSetIndex)
		const activeMessage = messages.find((message) => message.index === this.currentState?.activeMessageIndex)

		this.setVariableValues({
			timer: formatTime(remaining),
			clock: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
			hours: pad(hours),
			minutes: pad(minutes),
			seconds: pad(seconds),
			status: this.currentState?.timer?.state || 'offline',
			negative: remaining < 0,
			speaker: this.currentState?.speakerName || '',
			display_mode: this.currentState?.config?.displayMode || 'timer',
			display_online: this.currentState?.displayConnected === true,
			active_set: activeSet?.name || '',
			active_message: activeMessage?.text || this.currentState?.activeMessageText || '',
			room: this.room,
			connection: this.isConnected() ? 'online' : 'offline',
			phase: this.currentState?.phase || 'offline',
			display_count: Number(this.currentState?.displayCount || 0),
			companion_count: Number(this.currentState?.companionCount || 0),
			next_set: this.currentState?.nextSet?.speakerName || '',
			next_duration: formatTime(Number(this.currentState?.nextSet?.duration || 0)),
		})
	}

	private closeSocket(): void {
		this.authenticated = false
		if (!this.socket) return
		this.socket.removeAllListeners()
		this.socket.close()
		this.socket = undefined
	}

	private scheduleReconnect(): void {
		if (this.destroyed) return
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.reconnectTimer = setTimeout(() => this.connect(), 2000)
	}

	private handleConnectionError(error: unknown): void {
		this.updateStatus(InstanceStatus.ConnectionFailure, 'Não foi possível ligar ao ShowTimer Pro')
		this.log('debug', error instanceof Error ? error.message : String(error))
		this.scheduleReconnect()
	}
}

function pad(value: number): string {
	return String(value).padStart(2, '0')
}

function decodeRawData(data: RawData): string {
	if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
	return data.toString('utf8')
}

function formatTime(value: number): string {
	const negative = value < 0
	const absolute = Math.abs(value)
	const hours = Math.floor(absolute / 3600)
	const minutes = Math.floor((absolute % 3600) / 60)
	const seconds = absolute % 60
	const formatted = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
	return negative ? `-${formatted}` : formatted
}
