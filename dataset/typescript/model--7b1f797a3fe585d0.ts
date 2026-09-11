import { makeAutoObservable } from 'mobx'
import { singleton } from 'tsyringe'

import { App, Auth, DB, Iap, Layout, Locale, Screenlock, Search, Setting, Shortcuts, Stack } from '@/models'

@singleton()
export default class GlobalModel {
	unlistner = null as NodeJS.Timer | null

	constructor(
		public locale: Locale,
		public stack: Stack,
		public setting: Setting,
		public db: DB,
		public screenlock: Screenlock,
		public auth: Auth,
		public iap: Iap,
		public layout: Layout,
		public app: App,
		public shortcuts: Shortcuts,
		public search: Search
	) {
		makeAutoObservable(
			this,
			{
				locale: false,
				stack: false,
				setting: false,
				db: false,
				screenlock: false,
				auth: false,
				iap: false,
				layout: false,
				app: false,
				shortcuts: false,
				search: false,
				unlistner: false
			},
			{ autoBind: true }
		)
	}

	async init(unlock?: boolean) {
		this.on()
		this.stack.init()
		this.setting.init()

		await this.db.init()
		await this.screenlock.init(unlock)

		if (this.screenlock.screenlock_open) return this.lock()

		this.auth.init()
		this.layout.init()
		this.app.init()
		this.shortcuts.init()
		this.search.init()
	}

	lock() {
		this.stack.off()
	}

	unlock() {
		this.off()
		this.init(true)
	}

	on() {
		this.unlistner = setInterval(() => {
			requestIdleCallback(() => {
				this.setting.checkTheme()
			})
		}, 1000 * 60)

		$app.Event.on('global.app.lock', this.lock)
		$app.Event.on('global.app.unlock', this.unlock)
	}

	off() {
		this.locale.off()
		this.stack.off()
		this.setting.off()
		this.db.off()
		this.screenlock.off()
		this.auth.off()
		this.layout.off()
		this.app.off()
		this.shortcuts.off()
		this.search.off()

		clearInterval(this.unlistner!)

		$app.Event.off('global.app.lock', this.lock)
		$app.Event.off('global.app.unlock', this.unlock)
	}
}
