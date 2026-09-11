import { flatten } from 'lodash-es'
import { match } from 'ts-pattern'

import { getEditorJSON } from '@/utils/editor'

import { todos_cn, todos_en } from './data'

import type { Todo } from '@/types'
type Args = { file_id: string; angles: Todo.Setting['angles'] }

export default async (lang: 'cn' | 'en') => {
	const args = {} as Args

	const one_dirtree = await $db.dirtree_items
		.find({ selector: { module: 'todo', type: 'file' } })
		.sort({ create_at: 'asc' })
		.limit(1)
		.exec()

	if (!one_dirtree.length) return

	args.file_id = one_dirtree[0].id

	const one_module_setting = await $db.module_setting
		.find({ selector: { module: 'todo' } })
		.sort({ create_at: 'asc' })
		.limit(1)
		.exec()

	if (!one_module_setting.length) return

	args.angles = (JSON.parse(one_module_setting[0].setting) as Todo.Setting).angles

	const todos = match(lang)
		.with('cn', () => todos_cn())
		.with('en', () => todos_en())
		.exhaustive()

	args.angles.map((item, index) => {
		todos[index].map(todo => {
			todo['file_id'] = args.file_id
			todo['angle_id'] = item.id
		})
	})

	const items = flatten(todos).map(item => {
		if (item.type === 'todo') {
			item.text = JSON.stringify(getEditorJSON(item.text))
		}

		return item
	})

	$db.todo_items.bulkInsert(items)
}
