import dayjs from 'dayjs'

import type { Dayjs } from 'dayjs'

export default (start: Dayjs, end: Dayjs) => {
	const value = end.diff(start, 'minutes')
	const duration = dayjs.duration(value, 'minutes')
	const hours = duration.hours()
	const minutes = duration.minutes()

	let target = ''

	if (hours > 0) target += `${hours}h`
	if (minutes > 0) target += ` ${minutes}m`

	return { value, text: target }
}
