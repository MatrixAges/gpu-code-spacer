import dayjs from 'dayjs'

import type { Dayjs } from 'dayjs'

export default (format: string, time: Dayjs, minute: number | string) => {
	const now = dayjs()
	const current = now.format(format) + Math.floor(now.minute() / 10) * 10
	const key = time.format(format) + minute

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
