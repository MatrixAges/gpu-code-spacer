import { debounce } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { createRxDatabase } from 'rxdb'
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js'
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression'
import { migrateStorage } from 'rxdb/plugins/migration-storage'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'

import { insertDefaultSettings } from '@/actions/global'
import { insertDefault as insertDefaultNote } from '@/actions/note'
import { insertDefault as insertDefaultSchedule } from '@/actions/schedule'
import { keyCompression } from '@/config'
import { migration_schedule_items, migration_todo_items } from '@/migrations'
import {
	schema_dirtree_items,
	schema_kv,
	schema_module_setting,
	schema_note_items,
	schema_pomo_items,
	schema_schedule_items,
	schema_todo_items
} from '@/schemas'
import { statics } from '@/utils/rxdb'
import { local } from '@openages/stk/storage'

import type { Pomo, RxDB, Tray } from '@/types'
import type { RxCollection } from 'rxdb'

export default class Index {
	ready = false
	instance = null as RxDB.DBContent | null

	constructor() {
		makeAutoObservable(this, { instance: false }, { autoBind: true })
	}

	async init() {
		const db = await createRxDatabase<RxDB.DBContent>({
			name: 'if_v1',
			eventReduce: true,
			allowSlowCount: true,
			multiInstance: true,
			password: window.__key__(),
			cleanupPolicy: { waitForLeadership: false },
			ignoreDuplicate: window.$is_dev,
			storage: wrappedKeyEncryptionCryptoJsStorage({
				storage: keyCompression
					? wrappedKeyCompressionStorage({
							storage: getRxStorageDexie()
						})
					: getRxStorageDexie()
			})
		})

		await db.addCollections({
			kv: {
				autoMigrate: false,
				schema: schema_kv
			},
			module_setting: {
				autoMigrate: false,
				schema: schema_module_setting
			},
			dirtree_items: {
				autoMigrate: false,
				schema: schema_dirtree_items
			},
			todo_items: {
				autoMigrate: false,
				schema: schema_todo_items,
				statics,
				migrationStrategies: migration_todo_items
			},
			note_items: {
				autoMigrate: false,
				schema: schema_note_items,
				statics
			},
			pomo_items: {
				autoMigrate: false,
				schema: schema_pomo_items
			},
			schedule_items: {
				autoMigrate: false,
				schema: schema_schedule_items,
				statics,
				migrationStrategies: migration_schedule_items
			}
		})

		window.$db = db
		this.instance = db

		await this.migrateSchema()
		await this.updateDBTimeStamps()

		await Promise.all([
			await insertDefaultNote(),
			await insertDefaultSchedule(),
			await insertDefaultSettings('tray_settings', {
				todo: { active: false },
				schedule: { active: false }
			} as Tray.Setting),
			await insertDefaultSettings('pomo_settings', { sound: true } as Pomo.Setting)
		])

		this.ready = true

		$app.Event.emit('app/setLoading', { visible: false })

		this.hooks()
	}

	async updateDBTimeStamps() {
		if (!local.update_timestamps) local.update_timestamps = {}

		const keys = Object.keys(local.update_timestamps)

		if (!keys.length) return

		const sync_actions = keys.map(async (id: string) => {
			const file = await $db.dirtree_items.findOne(id).exec()

			if (!file) return delete local.update_timestamps[id]

			await file.updateCRDT({ ifMatch: { $set: { update_at: local.update_timestamps[id] } } })

			delete local.update_timestamps[id]
		})

		return Promise.all(sync_actions)
	}

	private async migrateRxdb() {
		$app.Event.emit('app/setLoading', { visible: true, desc: $t('app.migrating') })

		await migrateStorage({
			oldDatabaseName: 'if_v1',
			database: window.$db as any,
			oldStorage: window.$db.storage,
			batchSize: 300,
			parallel: true
		})
	}

	private async migrateSchema() {
		const collections = Object.values($db.collections)
		const check_migrations = collections.map(async item => ((await item.migrationNeeded()) ? item : false))
		const should_migrations = (await Promise.all(check_migrations)).filter(item => item)
		const migrations = should_migrations.map(item => (item as RxCollection).migratePromise(30))

		if (migrations.length) {
			$app.Event.emit('app/setLoading', { visible: true, desc: $t('app.migrating') })

			await Promise.all(migrations)
		}
	}

	private async updateLocalTimeStamps(id: string) {
		local.update_timestamps[id] = new Date().valueOf()
	}

	private hooks() {
		const debounceUpdateLocalTimeStamps = debounce(this.updateLocalTimeStamps, 900)

		$db.module_setting.postSave(data => debounceUpdateLocalTimeStamps(data.file_id), false)
		$db.todo_items.postSave(data => debounceUpdateLocalTimeStamps(data.file_id), false)
	}

	off() {
		this.instance?.destroy?.()
	}
}
