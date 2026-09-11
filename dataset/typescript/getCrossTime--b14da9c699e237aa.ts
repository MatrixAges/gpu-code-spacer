import dayjs from 'dayjs'

import type { Dayjs } from 'dayjs'

export default (start: Dayjs, end: Dayjs, timeline?: boolean) => {
	if (timeline) {
		const days = end.diff(start, 'hours') / 24

		return `${days}${$t('common.time.d')}`
	} else {
		const value = end.diff(start, 'minutes')
		const duration = dayjs.duration(value, 'minutes')
		const hours = duration.hours()
		const minutes = duration.minutes()

		let target = ''

		if (hours > 0) target += `${hours}${$t('common.time.h')} `
		if (minutes > 0) target += `${minutes}${$t('common.time.m')}`

		return target
	}
}
