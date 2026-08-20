import type ModuleInstance from './main.js'

type EmptyOptions = Record<string, never>

export type FeedbacksSchema = {
	timer_state: { type: 'boolean'; options: { state: string } }
	negative: { type: 'boolean'; options: EmptyOptions }
	blackout: { type: 'boolean'; options: EmptyOptions }
	blink: { type: 'boolean'; options: EmptyOptions }
	display_connected: { type: 'boolean'; options: EmptyOptions }
	display_mode: { type: 'boolean'; options: { mode: string } }
	active_set: { type: 'boolean'; options: { index: number } }
	message_visible: { type: 'boolean'; options: EmptyOptions }
	phase: { type: 'boolean'; options: { phase: string } }
	connected: { type: 'boolean'; options: EmptyOptions }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		timer_state: {
			name: 'Estado do cronómetro',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x008a2e },
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'Estado',
					default: 'running',
					choices: [
						{ id: 'running', label: 'Em andamento' },
						{ id: 'paused', label: 'Pausado' },
						{ id: 'idle', label: 'Parado' },
					],
				},
			],
			callback: (feedback) => self.currentState?.timer.state === feedback.options.state,
		},
		negative: {
			name: 'Tempo negativo',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0xcc0000 },
			options: [],
			callback: () => self.isNegative(),
		},
		blackout: {
			name: 'Blackout ativo',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x000000 },
			options: [],
			callback: () => self.currentState?.config.blackout === true,
		},
		blink: {
			name: 'Piscar ativo',
			type: 'boolean',
			defaultStyle: { color: 0x000000, bgcolor: 0xffffff },
			options: [],
			callback: () => self.currentState?.config.blink === true,
		},
		display_connected: {
			name: 'Display conectado',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x008a2e },
			options: [],
			callback: () => self.currentState?.displayConnected === true,
		},
		display_mode: {
			name: 'Modo de exibição ativo',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x11115a },
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
			callback: (feedback) => self.currentState?.config.displayMode === feedback.options.mode,
		},
		active_set: {
			name: 'Set ativo',
			type: 'boolean',
			defaultStyle: { color: 0x000000, bgcolor: 0xb9b8ff },
			options: [
				{
					id: 'index',
					type: 'dropdown',
					label: 'Set',
					default: 0,
					choices: self.getSetChoices(),
				},
			],
			callback: (feedback) => self.currentState?.activeSetIndex === Number(feedback.options.index),
		},
		message_visible: {
			name: 'Mensagem visível',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x7a2fb8 },
			options: [],
			callback: () => Number(self.currentState?.activeMessageIndex) >= 0,
		},
		phase: {
			name: 'Fase do tempo',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0xcc0000 },
			options: [
				{
					id: 'phase',
					type: 'dropdown',
					label: 'Fase',
					default: 'danger',
					choices: [
						{ id: 'normal', label: 'Normal' },
						{ id: 'warning', label: 'Aviso' },
						{ id: 'danger', label: 'Crítico' },
						{ id: 'overtime', label: 'Tempo excedido' },
					],
				},
			],
			callback: (feedback) => self.currentState?.phase === feedback.options.phase,
		},
		connected: {
			name: 'Ligação ao ShowTimer ativa',
			type: 'boolean',
			defaultStyle: { color: 0xffffff, bgcolor: 0x008a2e },
			options: [],
			callback: () => self.isConnected(),
		},
	})
}
