import dayjs from 'dayjs'

import type { Schedule } from '@/types'

const atom = 20
const base = 60 * 1000 * atom

export default (days: Schedule.CalendarDays) => {
	while (days.length < 7) {
		days.push([])
	}

	const today = dayjs().startOf('day').valueOf()

	days.forEach(items => {
		items.forEach(item => {
			item.start = (item.start_time - today) / base
			item.length = (item.end_time - item.start_time) / base
		})
	})

	return days
}
