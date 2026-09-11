import { cloneDeep } from 'lodash-es'
import { LRUMapWithDelete } from 'mnemonist'
import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { apps_home_page } from '@/appdata'
import Utils from '@/models/utils'
import { getDocItemsData, ipc, is_electron_shell } from '@/utils'
import { info } from '@/utils/antd'
import { arrayMove } from '@dnd-kit/sortable'
import { setStorageWhenChange } from '@openages/stk/mobx'

import type { App, DirTree } from '@/types'
import type { Subscription } from 'rxjs'
import type { DragEndEvent } from '@dnd-kit/core'

export interface HasUpdate {
	type: 'has_update'
	version: string
}

export interface Downloading {
	type: 'downloading'
	percent: number
}

type UpdateState = null | HasUpdate | Downloading | { type: 'downloaded' }

@injectable()
export default class Index {
	apps = apps_home_page
	visible_app_menu = false
	visible_homepage = false
	switch_index = 0
	update_silence = true
	update_status = null as UpdateState
	homepage_tab = 'apps' as 'latest' | 'star' | 'apps'
	homepage_active = 'todo' as App.ModuleType
	latest_ids = new LRUMapWithDelete<string, null>(18)
	star_ids = new LRUMapWithDelete<string, null>(18)
	latest_files = [] as DirTree.Items
	star_files = [] as DirTree.Items
	latest_watcher = null as Subscription | null
	star_watcher = null as Subscription | null

	constructor(public utils: Utils) {
		makeAutoObservable(
			this,
			{
				utils: false,
				latest_watcher: false,
				star_watcher: false
			},
			{ autoBind: true }
		)
	}

	init() {
		this.utils.acts = [
			setStorageWhenChange(
				[
					'homepage_tab',
					'homepage_active',
					{
						latest_ids: {
							toStorage: (v: Index['latest_ids']) => Object.fromEntries(v.entries()),
							fromStorage: (v: Record<string, null>) =>
								LRUMapWithDelete.from(
									Object.fromEntries(
										Object.keys(v)
											.reverse()
											.map(item => [item, null])
									),
									18
								)
						}
					},
					{
						star_ids: {
							toStorage: (v: Index['star_ids']) => Object.fromEntries(v.entries()),
							fromStorage: (v: Record<string, null>) =>
								LRUMapWithDelete.from(
									Object.fromEntries(
										Object.keys(v)
											.reverse()
											.map(item => [item, null])
									),
									18
								)
						}
					}
				],
				this
			)
		]

		this.on()
		this.watchLatest()
		this.watchStar()

		if (is_electron_shell) {
			this.onAppUpdate()
			this.checkUpdate(true)
		}
	}

	toggleHomeDrawer(v?: boolean | { tab: Index['homepage_tab']; active: Index['homepage_active'] }) {
		if (typeof v === 'object') {
			this.homepage_tab = v.tab
			this.homepage_active = v.active
			this.visible_homepage = true
		} else {
			this.visible_homepage = v !== undefined ? v : !this.visible_homepage
		}
	}

	onAppUpdate() {
		ipc.app.update.subscribe(undefined, {
			onData: args => {
				switch (args.type) {
					case 'can_update':
						this.update_status = { type: 'has_update', version: args.value }
						break
					case 'cant_update':
						if (!this.update_silence) $message.info($t('setting.Update.no_update'))

						break
					case 'progress':
						this.update_status = { type: 'downloading', percent: args.value }

						break
					case 'downloaded':
						this.update_status = { type: 'downloaded' }

						break
				}
			}
		})
	}

	checkUpdate(silence?: boolean) {
		if (!silence) this.update_silence = false

		ipc.app.checkUpdate.query()
	}

	install() {
		ipc.app.install.query()
	}

	setLatest(id: string) {
		this.latest_ids.set(id, null)

		this.latest_ids = cloneDeep(this.latest_ids)

		this.watchLatest()
	}

	setStar(id: string) {
		if (this.star_ids.has(id)) {
			this.star_ids.remove(id)
		} else {
			this.star_ids.set(id, null)
		}

		this.star_ids = cloneDeep(this.star_ids)

		this.watchStar()
	}

	removeFile(id: string) {
		this.latest_ids.remove(id)
		this.star_ids.remove(id)

		this.latest_ids = cloneDeep(this.latest_ids)
		this.star_ids = cloneDeep(this.star_ids)
	}

	watchLatest() {
		if (this.latest_watcher) this.latest_watcher.unsubscribe()

		this.latest_watcher = $db.dirtree_items.findByIds(Array.from(this.latest_ids.keys())).$.subscribe(doc => {
			this.latest_files = getDocItemsData(Array.from(doc.values())) as DirTree.Items
		})
	}

	watchStar() {
		if (this.star_watcher) this.star_watcher.unsubscribe()

		this.star_watcher = $db.dirtree_items.findByIds(Array.from(this.star_ids.keys())).$.subscribe(doc => {
			this.star_files = getDocItemsData(Array.from(doc.values())) as DirTree.Items
		})
	}

	onStarFilesDragEnd({ active, over }: DragEndEvent) {
		if (!over?.id) return false
		if (active.id === over.id) return

		const ids = $copy(this.star_files).map(item => item.id)

		const active_index = ids.findIndex(item => item === active.id)
		const over_index = ids.findIndex(item => item === over.id)
		const target = arrayMove(ids, active_index, over_index)

		this.star_ids = LRUMapWithDelete.from(
			Object.fromEntries(target.map(item => [item, null]).reverse()),
			18
		) as LRUMapWithDelete<string, null>

		this.watchStar()
	}

	async download() {
		await info({
			title: $t('common.notice'),
			content: $t('setting.Update.install_backup'),
			zIndex: 300000
		})

		$app.Event.emit('global.setting.backupExport')

		ipc.app.download.query()
	}

	on() {
		$app.Event.on('global.app.toggleHomeDrawer', this.toggleHomeDrawer)
		$app.Event.on('global.app.setLatest', this.setLatest)
		$app.Event.on('global.app.removeFile', this.removeFile)
	}

	off() {
		if (this.latest_watcher) this.latest_watcher.unsubscribe()
		if (this.star_watcher) this.star_watcher.unsubscribe()

		this.utils.off()

		$app.Event.off('global.app.toggleHomeDrawer', this.toggleHomeDrawer)
		$app.Event.off('global.app.setLatest', this.setLatest)
		$app.Event.off('global.app.removeFile', this.removeFile)
	}
}
