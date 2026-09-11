export namespace Project {
	export interface User {
		id: string
		name: string
	}

	export interface File {
		id: string
		permission: {
			[user_id: string]: 'read' | 'write'
		}
	}

	export type Item = {
		/** @maxLength 30 */
		file_id: string
		server: string
		files: Array<File>
		users: Array<User>
		pages: Array<string>
		create_at: number
		update_at?: number
		extends?: string
	}
}
