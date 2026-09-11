import { difference } from 'lodash-es'

import { getDocItemsData } from '@/utils'

import type { Todo } from '@/types'
import type { MangoQuerySelector } from 'rxdb'

export default async (file_id: string, todo_id?: string) => {
	const selector = (
		todo_id
			? { id: todo_id }
			: {
					file_id: file_id,
					type: 'todo',
					archive: false,
					status: {
						$ne: 'unchecked'
					},
					archive_time: {
						$exists: true,
						$ne: undefined,
						$lte: new Date().valueOf()
					}
				}
	) as MangoQuerySelector<Todo.Todo>

	const archive_items = await $db.todo_items.find({ selector }).exec()

	const archive_items_data = getDocItemsData(archive_items)

	await Promise.all(archive_items.map(item => item.updateCRDT({ ifMatch: { $set: { archive: true } } })))

	const module_setting = (await $db.module_setting.findOne({ selector: { file_id } }).exec())!

	const info = JSON.parse(module_setting.setting) as Todo.Setting

	if (info?.relations && info?.relations?.length && archive_items_data.length) {
		const relations = $copy(info.relations)

		relations.map((item, index) => {
			relations[index].items = difference(
				item.items,
				archive_items_data.map(item => item.id)
			)

			if (relations[index].items.length === 0) {
				relations.splice(index, 1)
			}
		})

		await module_setting.incrementalPatch({ setting: JSON.stringify({ ...info, relations }) })
	}
}
