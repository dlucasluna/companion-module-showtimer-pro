export type TimerState = 'idle' | 'running' | 'paused'
export type DisplayMode = 'timer' | 'clock' | 'both'

export type ShowTimerSet = {
	id?: string
	index: number
	name: string
	speakerName?: string
	duration: number
	notes?: string
}

export type ShowTimerMessage = {
	id?: string
	index: number
	text: string
	color?: string
	duration?: number
}

export type ShowTimerState = {
	timer: {
		state: TimerState
		targetTimestamp: number | null
		pausedRemaining: number | null
		originalDuration: number
		remainingSeconds?: number
		idleRemaining?: number
	}
	speakerName?: string
	config: {
		displayMode: DisplayMode
		bgColor: string
		textColor: string
		blink: boolean
		blackout: boolean
	}
	activeMessageText?: string
	nextSet?: ShowTimerSet | null
	remainingSeconds?: number
	phase?: 'normal' | 'warning' | 'danger' | 'overtime'
	sets?: ShowTimerSet[]
	messages?: ShowTimerMessage[]
	activeSetIndex?: number
	activeMessageIndex?: number
	displayConnected?: boolean
	displayCount?: number
	companionConnected?: boolean
	companionCount?: number
	serverTimestamp?: number
	clockDisplay?: string
	timeDisplay?: string
	timeHours?: string
	timeMinutes?: string
	timeSeconds?: string
}

export type ShowTimerCommand =
	| { action: 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'hide_message' | 'activate_next' }
	| { action: 'adjust'; seconds: number }
	| { action: 'set_time'; seconds: number }
	| { action: 'activate_set'; index: number }
	| { action: 'show_message'; index: number }
	| { action: 'blackout' | 'blink'; value: boolean }
	| { action: 'set_mode'; mode: DisplayMode }
	| { action: 'set_colors'; bg: string; text: string }
