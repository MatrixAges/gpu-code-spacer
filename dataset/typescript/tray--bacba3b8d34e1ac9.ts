export namespace Tray {
	export interface Setting {
		todo: {
			active: boolean
			file_id: string
			angle_id: string
		}
		schedule: {
			active: boolean
			file_id: string
		}
	}
}
