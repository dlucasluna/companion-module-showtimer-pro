import type ModuleInstance from './main.js'
import type { DisplayMode } from './types.js'

type EmptyOptions = Record<string, never>

export type ActionsSchema = {
	start: { options: EmptyOptions }
	pause: { options: EmptyOptions }
	resume: { options: EmptyOptions }
	stop: { options: EmptyOptions }
	reset: { options: EmptyOptions }
	activate_next: { options: EmptyOptions }
	adjust_time: { options: { seconds: number } }
	set_time: { options: { hours: number; minutes: number; seconds: number } }
	activate_set: { options: { index: number } }
	show_message: { options: { index: number } }
	hide_message: { options: EmptyOptions }
	blackout: { options: { mode: string } }
	blink: { options: { mode: string } }
	set_mode: { options: { mode: string } }
	set_colors: { options: { background: string; text: string } }
}

const toggleChoices = [
	{ id: 'toggle', label: 'Alternar' },
	{ id: 'on', label: 'Ligar' },
	{ id: 'off', label: 'Desligar' },
]

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		start: {
			name: 'Iniciar / continuar',
			options: [],
			callback: async () => self.sendCommand({ action: 'start' }),
		},
		pause: {
			name: 'Pausar',
			options: [],
			callback: async () => self.sendCommand({ action: 'pause' }),
		},
		resume: {
			name: 'Continuar',
			options: [],
			callback: async () => self.sendCommand({ action: 'resume' }),
		},
		stop: {
			name: 'Parar',
			options: [],
			callback: async () => self.sendCommand({ action: 'stop' }),
		},
		reset: {
			name: 'Reiniciar',
			options: [],
			callback: async () => self.sendCommand({ action: 'reset' }),
		},
		activate_next: {
			name: 'Ativar próximo set',
			options: [],
			callback: async () => self.sendCommand({ action: 'activate_next' }),
		},
		adjust_time: {
			name: 'Adicionar ou retirar tempo',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Segundos (use negativo para retirar)',
					default: 60,
					min: -86400,
					max: 86400,
					clampValues: true,
				},
			],
			callback: async (event) => self.sendCommand({ action: 'adjust', seconds: Number(event.options.seconds) }),
		},
		set_time: {
			name: 'Definir tempo',
			options: [
				{
					id: 'hours',
					type: 'number',
					label: 'Horas',
					default: 0,
					min: 0,
					max: 23,
					clampValues: true,
				},
				{
					id: 'minutes',
					type: 'number',
					label: 'Minutos',
					default: 10,
					min: 0,
					max: 59,
					clampValues: true,
				},
				{
					id: 'seconds',
					type: 'number',
					label: 'Segundos',
					default: 0,
					min: 0,
					max: 59,
					clampValues: true,
				},
			],
			callback: async (event) => {
				const total =
					Number(event.options.hours) * 3600 + Number(event.options.minutes) * 60 + Number(event.options.seconds)
				self.sendCommand({ action: 'set_time', seconds: total })
			},
		},
		activate_set: {
			name: 'Ativar set',
			options: [
				{
					id: 'index',
					type: 'dropdown',
					label: 'Set',
					default: 0,
					choices: self.getSetChoices(),
				},
			],
			callback: async (event) => self.sendCommand({ action: 'activate_set', index: Number(event.options.index) }),
		},
		show_message: {
			name: 'Exibir mensagem',
			options: [
				{
					id: 'index',
					type: 'dropdown',
					label: 'Mensagem',
					default: 0,
					choices: self.getMessageChoices(),
				},
			],
			callback: async (event) => self.sendCommand({ action: 'show_message', index: Number(event.options.index) }),
		},
		hide_message: {
			name: 'Ocultar mensagem',
			options: [],
			callback: async () => self.sendCommand({ action: 'hide_message' }),
		},
		blackout: {
			name: 'Blackout',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Estado',
					default: 'toggle',
					choices: toggleChoices,
				},
			],
			callback: async (event) => {
				const mode = String(event.options.mode)
				const current = self.currentState?.config.blackout === true
				self.sendCommand({ action: 'blackout', value: mode === 'toggle' ? !current : mode === 'on' })
			},
		},
		blink: {
			name: 'Piscar tela',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Estado',
					default: 'toggle',
					choices: toggleChoices,
				},
			],
			callback: async (event) => {
				const mode = String(event.options.mode)
				const current = self.currentState?.config.blink === true
				self.sendCommand({ action: 'blink', value: mode === 'toggle' ? !current : mode === 'on' })
			},
		},
		set_mode: {
			name: 'Modo de exibição',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Modo',
					default: 'timer',
					choices: [
						{ id: 'timer', label: 'Cronómetro' },
						{ id: 'clock', label: 'Relógio' },
						{ id: 'both', label: 'Ambos' },
					],
				},
			],
			callback: async (event) =>
				self.sendCommand({ action: 'set_mode', mode: String(event.options.mode) as DisplayMode }),
		},
		set_colors: {
			name: 'Definir cores do display',
			options: [
				{
					id: 'background',
					type: 'textinput',
					label: 'Fundo (hexadecimal)',
					default: '#000000',
				},
				{
					id: 'text',
					type: 'textinput',
					label: 'Texto (hexadecimal)',
					default: '#FFFFFF',
				},
			],
			callback: async (event) =>
				self.sendCommand({
					action: 'set_colors',
					bg: String(event.options.background),
					text: String(event.options.text),
				}),
		},
	})
}
