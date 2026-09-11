import { id } from '@/utils'

import type { Todo } from '@/types'

export const getTodo = (attrs?: Partial<Todo.Todo>): Omit<Todo.Todo, 'file_id' | 'angle_id' | 'sort'> => ({
	id: id(),
	type: 'todo',
	status: 'unchecked',
	text: '',
	archive: false,
	create_at: new Date().valueOf(),
	...attrs
})

export const getGroup = (attrs?: Partial<Todo.Group>): Omit<Todo.Group, 'file_id' | 'angle_id' | 'sort'> => ({
	id: id(),
	type: 'group',
	text: '',
	create_at: new Date().valueOf(),
	...attrs
})
