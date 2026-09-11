import type { Todo, RxDB } from '@/types'

export const updateTodoItem = async (id: string, v: Partial<Todo.Todo>) => {
	const doc = (await $db.todo_items.findOne(id).exec())!

	return doc.updateCRDT({ ifMatch: { $set: v } })
}

export const getTodoItems = (file_id: string, angle_id: string) => {
	return $db.todo_items
		.find({ selector: { file_id, angle_id } as Todo.TodoItem })
		.sort({ sort: 'asc', create_at: 'asc' }) as RxDB.ItemsQuery<Todo.TodoItem>
}

export const removeTodoItem = async (id: string) => {
	await $db.todo_items.findOne(id).remove()
}
