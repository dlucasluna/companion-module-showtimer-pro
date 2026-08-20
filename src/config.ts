import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	pairingCode: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Ligação direta',
			value: 'Informe o IP mostrado em “Configurar Companion e display” no ShowTimer Pro. Não é necessário MQTT.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP do ShowTimer Pro',
			width: 8,
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Porta',
			width: 4,
			min: 1,
			max: 65535,
			default: 41730,
		},
		{
			type: 'textinput',
			id: 'pairingCode',
			label: 'Código de pareamento (6 dígitos)',
			width: 6,
			default: '',
			regex: '/^[0-9]{6}$/',
		},
		{
			type: 'static-text',
			id: 'security',
			width: 6,
			label: 'Segurança',
			value: 'O código está em ShowTimer Pro → Companion. É necessário quando o Companion está noutro computador.',
		},
	]
}
