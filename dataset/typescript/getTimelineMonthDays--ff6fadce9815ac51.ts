import getDayDetails from './getDayDetails'

import type { Dayjs } from 'dayjs'

export default (day: Dayjs) => {
	const start = day.subtract(6, 'day')
	const end = day.add(6, 'day')
	const calendar_data = []

	let current = start

	while (current.isSameOrBefore(end)) {
		const target = getDayDetails(current)

		calendar_data.push(target)

		current = current.add(1, 'day')
	}

	return calendar_data
}
