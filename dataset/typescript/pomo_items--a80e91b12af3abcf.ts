export namespace Pomo {
	export interface Setting {
		sound: boolean
	}

	export interface Session {
		id: string
		title: string
		work_time: number
		break_time: number
		flow_mode: boolean
	}

	export type Item = {
		/** @maxLength 30 */
		file_id: string
		sessions: Array<Session>
		index: number
		current: 'work' | 'break' | null
		going: boolean
		work_in: number
		break_in: number
		continuous_mode: boolean
		create_at: number
		update_at?: number
		extends?: string
	}
}
