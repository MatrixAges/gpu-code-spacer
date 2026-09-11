import dayjs from 'dayjs'

import getDayDetails from './getDayDetails'

import type { Dayjs } from 'dayjs'
import type { DayDetail } from './getDayDetails'

export default (day: Dayjs) => {
	const target = [] as Array<DayDetail>

	for (let month = 1; month <= 12; month++) {
		const first_day = dayjs()
			.year(day.year())
			.month(month - 1)
			.date(1)
			.startOf('day')

		target.push(getDayDetails(first_day))
	}

	return target
}
