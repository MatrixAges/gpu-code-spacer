import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { check, queryItem, recycle } from '@/modules/todo/services'
import { getDocItem, getDocItemsData } from '@/utils'
import { deepEqual } from '@openages/stk/react'

import { getTodoItems, removeTodoItem, updateTodoItem } from './services'

import type { Todo } from '@/types'
import type { Subscription } from 'rxjs'
import type { RxDocument } from 'rxdb'
import type { IProps } from './index'

@injectable()
export default class Index {
	file_id = ''
	angle_id = ''
	items = [] as Array<Todo.TodoItem>

	watcher = null as unknown as Subscription

	constructor() {
		makeAutoObservable(this, { file_id: false, angle_id: false, watcher: false }, { autoBind: true })
	}

	init(args: Pick<IProps, 'file_id' | 'angle_id'>) {
		const { file_id, angle_id } = args

		this.file_id = file_id
		this.angle_id = angle_id

		this.watchItems()
	}

	async remove(index: number) {
		const items = $copy(this.items)

		const [item] = items.splice(index, 1)

		this.items = items

		await removeTodoItem(item.id)
	}

	async updateTodoItem(index: number, id: string, v: Partial<Todo.Todo>) {
		this.items[index] = { ...this.items[index], ...v } as Todo.Todo

		await updateTodoItem(id, v)
	}

	async changeStatus(index: number, id: string, status: Todo.Todo['status']) {
		const { file_id } = this.items[index]

		this.items[index] = { ...this.items[index], status } as Todo.Todo

		const settings_string = (await $db.module_setting.findOne(file_id).exec())!

		const todo_setting = getDocItem(settings_string)!
		const target_setting = JSON.parse(todo_setting.setting)

		await check({
			file_id,
			setting: target_setting,
			id,
			status
		})

		const todo_item = (await queryItem(id)) as RxDocument<Todo.Todo>

		if (todo_item.remind_time) {
			await todo_item.updateCRDT({ ifMatch: { $set: { remind_time: undefined } } })
		}

		if (status === 'checked') {
			recycle(todo_item)
		} else {
			if (todo_item.cycle_enabled && todo_item.cycle && todo_item.cycle.value !== undefined) {
				await todo_item.updateCRDT({ ifMatch: { $unset: { recycle_time: '' } } })
			}
		}
	}

	watchItems() {
		this.watcher = getTodoItems(this.file_id, this.angle_id).$.subscribe(docs => {
			const items = getDocItemsData(docs)

			if (deepEqual(items, $copy(this.items))) return

			this.items = items
		})
	}

	off() {
		this.watcher?.unsubscribe?.()
	}
}
