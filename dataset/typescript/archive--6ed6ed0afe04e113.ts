import dayjs from 'dayjs'

import type { Todo } from '@/types'

export const getArchiveTime = (auto_archiving: Todo.Setting['auto_archiving']) => {
	const now = dayjs()

	switch (auto_archiving) {
		case '0m':
			return now.valueOf()
		case '3m':
			return now.add(3, 'minute').valueOf()
		case '3h':
			return now.add(3, 'hour').valueOf()
		case '1d':
			return now.add(1, 'day').valueOf()
		case '3d':
			return now.add(3, 'day').valueOf()
		case '7d':
			return now.add(7, 'day').valueOf()
	}
}
