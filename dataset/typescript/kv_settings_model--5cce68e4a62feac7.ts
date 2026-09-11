import { makeAutoObservable } from 'mobx'

import type { Subscription } from 'rxjs'
import type { DocKV } from '@/schemas'

export default class Index<T> {
	settings = {} as T
	settings_watcher = {} as Subscription

	constructor() {
		makeAutoObservable(this, { settings_watcher: false }, { autoBind: true })
	}

	init(key: string) {
		const { promise, resolve } = Promise.withResolvers()

		this.settings_watcher = $db.kv.findOne(key).$.subscribe(doc => {
			if (!doc) return resolve()

			this.settings = JSON.parse(doc.value)

			resolve()
		})

		return promise
	}

	off() {
		this.settings_watcher?.unsubscribe?.()
	}
}
