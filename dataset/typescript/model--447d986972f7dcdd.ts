import { makeAutoObservable } from 'mobx'
import { injectable } from 'tsyringe'

import { getDocItemsData } from '@/utils'
import { getEditorText } from '@/utils/editor'

import type { Todo } from '@/types'

@injectable()
export default class Index {
	search_todos = [] as Array<Todo.Todo>
	compositing = false
	tab = 'todos' as 'todos' | 'search'

	constructor() {
		makeAutoObservable(this, {}, { autoBind: true })
	}

	async search(text: string) {
		if (this.compositing) return
		if (!text) return (this.search_todos = [])

		const docs = await $db.todo_items
			.find({
				selector: {
					text: { $regex: `.*${text}.*`, $options: 'i' },
					type: 'todo'
				},
				index: 'file_id'
			})
			.exec()

		this.search_todos = getDocItemsData(docs).map(item => {
			item.text = getEditorText(item.text)

			return item
		}) as Array<Todo.Todo>
	}
}
