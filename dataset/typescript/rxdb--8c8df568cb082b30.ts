import { addRxPlugin } from 'rxdb'
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup'
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump'
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema'
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder'
import { RxDBUpdatePlugin } from 'rxdb/plugins/update'

import { RxDBcrdtPlugin } from '@/utils/rxdb/plugins/crdt'

const plugins = [
	RxDBCleanupPlugin,
	RxDBcrdtPlugin,
	RxDBMigrationPlugin,
	RxDBQueryBuilderPlugin,
	RxDBUpdatePlugin,
	RxDBJsonDumpPlugin
]

plugins.forEach(item => addRxPlugin(item))

if (process.env.NODE_ENV !== 'production') {
	// @ts-ignore
	import('rxdb/plugins/dev-mode').then(({ RxDBDevModePlugin, disableWarnings }) => {
		disableWarnings()
		addRxPlugin(RxDBDevModePlugin)
	})
}
