import { id } from '@/utils'

import insertSetting from './insertSetting'

export default async () => {
	const counts = await $db.dirtree_items.count({ selector: { module: 'schedule', type: 'file' } }).exec()

	if (counts) return

	const file_id = id()

	await $db.dirtree_items.insert({
		module: 'schedule',
		type: 'file',
		id: file_id,
		name: $t('common.default'),
		icon: ':sa:',
		create_at: new Date().valueOf()
	})

	await insertSetting(file_id)
}
