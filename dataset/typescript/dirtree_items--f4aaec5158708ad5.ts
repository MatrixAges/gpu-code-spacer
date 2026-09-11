export namespace DirTree {
	export type Item = {
		/** @maxLength 30 */
		module: string
		type: 'dir' | 'file'
		/** @maxLength 30 */
		id: string
		name: string
		create_at: number
		pid?: string
		prev_id?: string
		next_id?: string
		icon?: string
		icon_hue?: number
		update_at?: number
		backup_at?: number
		projects?: Array<string>
		extends?: string
	}

	export type Items = Array<Item>
}
