export namespace ModuleSetting {
	export type Item = {
		/** @maxLength 30 */
		file_id: string
		/** @maxLength 30 */
		module: string
		setting: string
		create_at: number
		update_at?: number
		extends?: string
	}
}
