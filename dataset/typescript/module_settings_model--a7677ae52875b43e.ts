import { makeAutoObservable } from 'mobx'

import type { Subscription } from 'rxjs'
import type { DocKV } from '@/schemas'

export default class Index<T> {
	settings = {} as T
	settings_watcher = {} as Subscription

	constructor() {
		makeAutoObservable(this, { settings_watcher: false }, { autoBind: true })
	}

	init(file_id: string) {
		const { promise, resolve } = Promise.withResolvers()

		this.settings_watcher = $db.module_setting.findOne({ selector: { file_id } }).$.subscribe(doc => {
			if (!doc) {
				resolve()

				return this.off()
			}

			this.settings = JSON.parse(doc!.setting)

			resolve()
		})

		return promise
	}

	off() {
		this.settings_watcher?.unsubscribe?.()
	}
}
