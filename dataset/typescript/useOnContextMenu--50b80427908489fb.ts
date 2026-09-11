import { useMemoizedFn } from 'ahooks'
import { omit } from 'lodash-es'

import { id as genId } from '@/utils'

import type { Todo } from '@/types'
import type { IPropsTodoItem } from '../types'

interface HookArgs {
	item: IPropsTodoItem['item']
	index: IPropsTodoItem['index']
	mode: IPropsTodoItem['mode']
	dimension_id: IPropsTodoItem['dimension_id']
	update: IPropsTodoItem['update']
	moveTo: IPropsTodoItem['moveTo']
	insert: IPropsTodoItem['insert']
	tab: IPropsTodoItem['tab']
	remove: IPropsTodoItem['remove']
	showDetailModal: IPropsTodoItem['showDetailModal']
	insertChildren: (children_index?: number) => Promise<void>
}

export default (args: HookArgs) => {
	const { item, index, mode, dimension_id, update, moveTo, insert, tab, remove, showDetailModal, insertChildren } =
		args
	const { id, tag_ids } = item

	const onContextMenu = useMemoizedFn(({ key, keyPath }) => {
		if (keyPath.length > 1) {
			const parent_key = keyPath.at(-1)
			const target_key = keyPath.at(0)

			switch (parent_key) {
				case 'change_level':
					update({
						type: 'parent',
						index,
						dimension_id,
						value: { level: target_key === '0' ? undefined : Number(target_key) } as Todo.Todo
					})
					break
				case 'add_tags':
					let target = [] as Array<string>

					if (tag_ids?.length) {
						if (tag_ids.includes(target_key)) {
							target = tag_ids.filter(item => item !== target_key)
						} else {
							target = [...tag_ids, target_key]
						}
					} else {
						target.push(target_key)
					}

					update({
						type: 'parent',
						index,
						dimension_id,
						value: { tag_ids: target } as Todo.Todo
					})

					break
				case 'move':
					moveTo(id, target_key)
					break
			}
		} else {
			switch (key) {
				case 'detail':
					showDetailModal({
						id,
						index,
						...(mode === 'kanban' || mode === 'quad' || mode === 'flat' || mode === 'mindmap'
							? { dimension_id }
							: {})
					})
					break
				case 'insert':
					insert({ index, dimension_id })
					break
				case 'clone':
					insert({
						index,
						dimension_id,
						data: {
							...omit(item, ['id', 'create_at', 'done_time']),
							id: genId(),
							status: 'unchecked'
						} as Todo.Todo
					})
					break
				case 'insert_children':
					insertChildren()
					break
				case 'move_into':
					tab({ type: 'in', index, dimension_id })
					break
				case 'remove':
					remove({ index, dimension_id, id })
					break
			}
		}
	})

	return { onContextMenu }
}
