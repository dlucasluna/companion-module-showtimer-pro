import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import type { ActionsSchema } from './actions.js'
import type { FeedbacksSchema } from './feedbacks.js'
import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'

type Preset = CompanionPresetDefinitions<ModuleSchema>[string]

const white = 0xffffff
const black = 0x000000
const green = 0x009b2f
const orange = 0xff7a00
const red = 0xe20b16
const grey = 0x666666
const blue = 0x0808c8
const darkBlue = 0x10104f
const violet = 0xb9b8ff

function actionPreset(
	name: string,
	text: string,
	bgcolor: number,
	actionId: keyof ActionsSchema,
	options: Record<string, unknown> = {},
	feedbackId?: keyof FeedbacksSchema,
	feedbackOptions: Record<string, unknown> = {},
	feedbackStyle: Record<string, unknown> = {},
): Preset {
	return {
		type: 'simple',
		name,
		style: {
			text,
			size: 'auto',
			color: white,
			bgcolor,
			show_topbar: false,
		},
		steps: [
			{
				down: [{ actionId, options }],
				up: [],
			},
		],
		feedbacks: feedbackId
			? [
					{
						feedbackId,
						options: feedbackOptions,
						style: { color: white, bgcolor, ...feedbackStyle },
					},
				]
			: [],
	} as Preset
}

function livePreset(name: string, text: string, bgcolor = black, feedbackId?: keyof FeedbacksSchema): Preset {
	return {
		type: 'simple',
		name,
		style: {
			text,
			size: 'auto',
			color: white,
			bgcolor,
			show_topbar: false,
		},
		steps: [],
		feedbacks: feedbackId
			? [
					{
						feedbackId,
						options: {},
						style: { color: white, bgcolor: red },
					},
				]
			: [],
	} as Preset
}

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	presets.start = actionPreset('Iniciar', '▶\nSTART', green, 'start', {}, 'timer_state', { state: 'running' })
	presets.pause = actionPreset('Pausar', 'Ⅱ\nPAUSE', orange, 'pause', {}, 'timer_state', { state: 'paused' })
	presets.stop = actionPreset('Parar', '■\nSTOP', red, 'stop')
	presets.reset = actionPreset('Reiniciar', '↻\nRESET', grey, 'reset')
	presets.next = actionPreset('Próximo set', '→\nNEXT', 0x1769aa, 'activate_next')

	presets.plus_1 = actionPreset('Adicionar 1 minuto', '+1:00', 0x0909f0, 'adjust_time', { seconds: 60 })
	presets.plus_5 = actionPreset('Adicionar 5 minutos', '+5:00', 0x0909f0, 'adjust_time', { seconds: 300 })
	presets.minus_1 = actionPreset('Retirar 1 minuto', '−1:00', blue, 'adjust_time', { seconds: -60 })
	presets.minus_5 = actionPreset('Retirar 5 minutos', '−5:00', blue, 'adjust_time', { seconds: -300 })

	const setCount = Math.max(8, Math.min(32, self.currentState?.sets?.length || 0))
	for (let index = 0; index < setCount; index += 1) {
		const label = self.currentState?.sets?.[index]?.name || `Set ${index + 1}`
		presets[`set_${index + 1}`] = actionPreset(
			label,
			label,
			violet,
			'activate_set',
			{ index },
			'active_set',
			{ index },
			{ color: black, bgcolor: 0xd4d3ff },
		)
	}

	presets.mode_timer = actionPreset(
		'Modo cronómetro',
		'◷\nTIMER',
		darkBlue,
		'set_mode',
		{ mode: 'timer' },
		'display_mode',
		{ mode: 'timer' },
	)
	presets.mode_clock = actionPreset(
		'Modo relógio',
		'◴\nCLOCK',
		darkBlue,
		'set_mode',
		{ mode: 'clock' },
		'display_mode',
		{ mode: 'clock' },
	)
	presets.mode_both = actionPreset('Modo ambos', '◷◴\nAMBOS', darkBlue, 'set_mode', { mode: 'both' }, 'display_mode', {
		mode: 'both',
	})
	presets.blink = actionPreset(
		'Piscar tela',
		'⚡\nPISCAR',
		white,
		'blink',
		{ mode: 'toggle' },
		'blink',
		{},
		{ color: black },
	)
	presets.blackout = actionPreset('Blackout', '■\nBLACKOUT', black, 'blackout', { mode: 'toggle' }, 'blackout')

	presets.timer_live = livePreset('Cronómetro ao vivo', '$(showtimer-pro:timer)', 0x710000, 'negative')
	presets.clock_live = livePreset('Hora atual', '$(showtimer-pro:clock)', 0x2b2b2b)
	presets.hours_live = livePreset('Horas', '$(showtimer-pro:hours)', 0x710000)
	presets.minutes_live = livePreset('Minutos', '$(showtimer-pro:minutes)', 0x710000)
	presets.seconds_live = livePreset('Segundos', '$(showtimer-pro:seconds)', 0x710000)
	presets.speaker_live = livePreset('Orador atual', '$(showtimer-pro:speaker)', 0x202020)

	const messageCount = Math.max(4, Math.min(16, self.currentState?.messages?.length || 0))
	for (let index = 0; index < messageCount; index += 1) {
		const text = self.currentState?.messages?.[index]?.text || `MSG ${index + 1}`
		presets[`message_${index + 1}`] = actionPreset(text, text, 0x5c238c, 'show_message', {
			index,
		})
	}
	presets.hide_message = actionPreset('Ocultar mensagem', 'OCULTAR\nMSG', 0x333333, 'hide_message')

	const structure: CompanionPresetSection[] = [
		{
			id: 'transport',
			name: 'Controlo do cronómetro',
			definitions: [
				{
					id: 'transport_controls',
					name: 'Transportes',
					description: 'Iniciar, pausar, parar e reiniciar.',
					type: 'simple',
					presets: ['start', 'pause', 'stop', 'reset', 'next'],
				},
				{
					id: 'time_adjustments',
					name: 'Ajustes rápidos',
					type: 'simple',
					presets: ['plus_1', 'plus_5', 'minus_1', 'minus_5'],
				},
			],
		},
		{
			id: 'live_values',
			name: 'Valores em tempo real',
			definitions: [
				{
					id: 'live_displays',
					name: 'Cronómetro e relógio',
					type: 'simple',
					presets: ['timer_live', 'clock_live', 'hours_live', 'minutes_live', 'seconds_live', 'speaker_live'],
				},
			],
		},
		{
			id: 'sets',
			name: 'Sets',
			definitions: [
				{
					id: 'set_buttons',
					name: 'Ativar set',
					type: 'simple',
					presets: Array.from({ length: setCount }, (_, index) => `set_${index + 1}`),
				},
			],
		},
		{
			id: 'display',
			name: 'Display',
			definitions: [
				{
					id: 'display_modes',
					name: 'Modos e efeitos',
					type: 'simple',
					presets: ['mode_timer', 'mode_clock', 'mode_both', 'blink', 'blackout'],
				},
			],
		},
		{
			id: 'messages',
			name: 'Mensagens',
			definitions: [
				{
					id: 'message_buttons',
					name: 'Mostrar ou ocultar',
					type: 'simple',
					presets: [...Array.from({ length: messageCount }, (_, index) => `message_${index + 1}`), 'hide_message'],
				},
			],
		},
	]

	self.setPresetDefinitions(structure, presets)
}
