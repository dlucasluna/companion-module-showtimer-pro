import type ModuleInstance from './main.js'

export type VariablesSchema = {
	timer: string
	clock: string
	hours: string
	minutes: string
	seconds: string
	status: string
	negative: boolean
	speaker: string
	display_mode: string
	display_online: boolean
	active_set: string
	active_message: string
	room: string
	connection: string
	phase: string
	display_count: number
	companion_count: number
	next_set: string
	next_duration: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		timer: { name: 'Cronómetro em tempo real' },
		clock: { name: 'Hora atual' },
		hours: { name: 'Horas do cronómetro' },
		minutes: { name: 'Minutos do cronómetro' },
		seconds: { name: 'Segundos do cronómetro' },
		status: { name: 'Estado do cronómetro' },
		negative: { name: 'Tempo negativo' },
		speaker: { name: 'Orador atual' },
		display_mode: { name: 'Modo do display' },
		display_online: { name: 'Display conectado' },
		active_set: { name: 'Set ativo' },
		active_message: { name: 'Mensagem ativa' },
		room: { name: 'Código da sala' },
		connection: { name: 'Estado da ligação' },
		phase: { name: 'Fase do tempo (normal/aviso/crítico/excedido)' },
		display_count: { name: 'Número de displays ligados' },
		companion_count: { name: 'Número de Companion ligados' },
		next_set: { name: 'Próximo set' },
		next_duration: { name: 'Duração do próximo set' },
	})
}
