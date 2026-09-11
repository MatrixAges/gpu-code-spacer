import dayjs from 'dayjs'
import { match } from 'ts-pattern'

import { getRelativeTime } from '@/atoms/TodoActivity/utils'

import type { Dayjs } from 'dayjs'
import type { CleanTime } from '@/types'

export const minute_pieces = Array.from({ length: 6 }, (_, index) => index)
export const hour_counts = Array.from({ length: 24 }, (_, index) => index)
export const month_counts = Array.from({ length: 12 }, (_, index) => index)

export const format = (v: Dayjs, ignoreDetail?: boolean) => {
	if (!v) return undefined as unknown as string

	if (v.valueOf() <= dayjs().valueOf()) {
		const diff = dayjs().diff(v, 'day')

		if (diff < 1) return `${$t('common.outdate')} ${dayjs().to(v)}`

		const unit = match(diff > 1)
			.with(true, () => $t('common.time.days'))
			.otherwise(() => $t('common.time.day'))

		return `${$t('common.outdate')} ${diff} ${unit}`
	}

	let detail_time = v.format('HH:mm')

	const now = dayjs()

	if (ignoreDetail) return dayjs().to(v)
	if (v.diff(now, 'month') >= 3) return v.format('YYYY-MM-DD')

	const target = (detail: string) => `${dayjs().to(v)} (${detail})`

	if (v.diff(now, 'hour') >= 24) {
		detail_time = v.format('MM-DD HH:mm')

		return target(detail_time)
	}

	return target(detail_time)
}

export const getCleanTime = (v: CleanTime) => {
	const now = dayjs()

	return match(v)
		.with('1year', () => now.subtract(1, 'year'))
		.with('6month', () => now.subtract(6, 'month'))
		.with('3month', () => now.subtract(3, 'month'))
		.with('1month', () => now.subtract(1, 'month'))
		.with('15days', () => now.subtract(15, 'day'))
		.with('1week', () => now.subtract(1, 'week'))
		.exhaustive()
}

export const getDays = (type: 'week' | 'month' | 'year', v: Dayjs) => {
	const start = v.startOf(type)
	const end = v.endOf(type)
	const dates = [] as Array<Dayjs>

	let current = start

	while (current.isSameOrBefore(end)) {
		dates.push(current)

		current = current.add(1, 'day')
	}

	return dates
}

export const getMonthDays = (day: Dayjs) => {
	const start_of_month = day.startOf('month')
	const end_of_month = day.endOf('month')
	const calendar_data = []

	let start_of_week = start_of_month.startOf('week')

	while (start_of_week.isSameOrBefore(end_of_month)) {
		const end_of_week = start_of_week.endOf('week')
		const week_data = []
		let current_date = start_of_week

		while (current_date.isBefore(end_of_week) || current_date.isSame(end_of_week)) {
			const is_current_month = current_date.isSame(start_of_month, 'month')

			week_data.push((!is_current_month ? '~' : '') + current_date.format('YYYY-MM-DD'))

			current_date = current_date.add(1, 'day')
		}

		calendar_data.push(week_data)

		start_of_week = end_of_week.add(1, 'day')
	}

	return calendar_data
}

const transform = (matrix: Array<Array<string>>) => {
	const rows = matrix.length
	const cols = matrix[0].length
	const target = [] as Array<Array<string>>

	let all = 0
	let pass = 0
	let left = 0

	for (let j = 0; j < cols; j++) {
		target[j] = []

		for (let i = 0; i < rows; i++) {
			target[j][i] = matrix[i][j]
		}
	}

	const days = target.map(col => {
		const target_col = {} as Record<string, 'pass' | 'now' | 'future'>

		col.forEach(item => {
			const relative_date = getRelativeTime('YYYY-MM-DD', dayjs(item.replace('~', '')))

			target_col[item] = relative_date

			if (item.indexOf('~') === -1) {
				all += 1

				if (relative_date === 'pass') {
					pass += 1
				} else {
					left += 1
				}
			}
		})

		return target_col
	})

	return { days, all, pass, left }
}

export const getMonthDaysWithWeekCol = (day: Dayjs) => transform(getMonthDays(day))
