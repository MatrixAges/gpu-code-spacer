import dayjs from 'dayjs'

import type { Dayjs } from 'dayjs'

export default (format: string, time: Dayjs) => {
	const now = dayjs()
	const current = now.format(format)
	const key = time.format(format)

	let relative_time = null as unknown as 'pass' | 'now' | 'future'

	if (current === key) {
		relative_time = 'now'
	} else if (time.isAfter(now)) {
		relative_time = 'future'
	} else if (time.isBefore(now)) {
		relative_time = 'pass'
	}

	return relative_time
}
