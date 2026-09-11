import { useEffect, useState } from 'react'

import { getDocItemsData } from '@/utils'

import type { Subscription } from 'rxjs'
import type { Todo, Schedule } from '@/types'

export default (todos: Schedule.Item['todos']) => {
	const [status, setStatus] = useState('')

	useEffect(() => {
		let watcher = null as unknown as Subscription

		if (todos?.length) {
			watcher = $db.todo_items.findByIds(todos).$.subscribe(doc => {
				const items = getDocItemsData(Array.from(doc.values())) as Array<Todo.Todo>

				const done_items = items.filter(item => item.status === 'checked' || item.status === 'closed')

				if (done_items.length !== items.length) {
					setStatus(`${done_items.length}/${items.length}`)
				} else {
					setStatus('ok')
				}
			})
		} else {
			setStatus('')
		}

		return () => watcher?.unsubscribe?.()
	}, [todos])

	return status
}
