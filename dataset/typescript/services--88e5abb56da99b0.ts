import type { Todo } from '@/types'

export const updateTodoItem = async (id: string, v: Partial<Todo.Todo>) => {
	const doc = (await $db.todo_items.findOne(id).exec())!

	return doc.updateCRDT({ ifMatch: { $set: v } })
}

export const getTodoItems = (ids: Array<string>) => {
	return $db.todo_items.findByIds(ids)
}
