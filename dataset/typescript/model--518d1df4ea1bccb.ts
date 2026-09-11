import dayjs from 'dayjs'
import { pick } from 'lodash-es'
import { makeAutoObservable } from 'mobx'
import { domToPng } from 'modern-screenshot'

import getTodoItems from '@/modules/todo/utils/getTodoItems'
import {
	downloadImage,
	getDays,
	getMonthDaysWithWeekCol,
	getPercent,
	hour_counts,
	minute_pieces,
	month_counts
} from '@/utils'

import { getRelativeMinute, getRelativeTime } from './utils'

import type { Todo } from '@/types'
import type { MangoQuerySelector, RxDocument } from 'rxdb'

type RelativeDate = 'pass' | 'now' | 'future'

interface TodoItem {
	id: string
	text: string
	done_time: string
}

export type Todos = { todos: Array<TodoItem>; relative_date: RelativeDate } | RelativeDate

type ChartItem = Record<string, Todos>
type ChartItems = Array<ChartItem>
type ChartData = {
	items: ChartItems
	percent: number
	left: number
	total_todos: number
	max: { time: string; count: number }
} | null

export default class Index {
	id = ''
	type = 'day' as 'day' | 'week' | 'month' | 'year'
	current = dayjs().format('YYYY-MM-DD HH:mm:ss') as string
	current_date = dayjs()
	index = null as { index: number; key: string } | null
	data_items = [] as Array<TodoItem>
	chart_data = null as ChartData

	chart_dom = null as HTMLDivElement | null

	get total() {
		return this.data_items.length
	}

	constructor() {
		makeAutoObservable(this, { current_date: false, chart_dom: false }, { autoBind: true })
	}

	init(args: { id?: Index['id']; type?: Index['type'] }) {
		const { id, type } = args

		if (id) this.id = id
		if (type) this.type = type

		this.query()
	}

	async query(v?: Index['type']) {
		this.type = v || 'day'
		this.index = null

		const now = this.current_date
		const selector: MangoQuerySelector<Todo.Todo> = { file_id: this.id, type: 'todo', status: 'checked' }

		selector['done_time'] = {
			$gte: now.startOf(this.type).valueOf(),
			$lte: now.endOf(this.type).valueOf()
		}

		const items = await $db.todo_items.find({ selector }).sort({ done_time: 'desc' }).limit(99999).exec()

		const data_items = getTodoItems(items as Array<RxDocument<Todo.Todo>>, item =>
			pick(item, ['id', 'text', 'done_time'])
		) as Array<TodoItem>

		this.data_items = data_items

		let all = 0
		let pass = 0
		let left = 0
		let total_todos = data_items.length
		let max = { time: '', count: 0 }

		if (this.type === 'day') {
			this.current = now.format('YYYY-MM-DD HH:mm')

			left = 23 - now.hour()

			const cols: ChartItems = hour_counts.map(hour => {
				return minute_pieces.reduce(
					(total, v) => {
						const minute = v * 10
						const time = now.hour(hour).minute(minute)
						const relative_date = getRelativeMinute(
							'YYYY-MM-DD HH:' + minute,
							time,
							minute === 0 ? '00' : minute
						)

						total[time.format('YYYY-MM-DD HH:') + (minute === 0 ? '00' : minute)] =
							relative_date

						all += 1

						if (relative_date === 'pass') {
							pass += 1
						}

						return total
					},
					{} as Record<string, RelativeDate>
				)
			})

			data_items.forEach(item => {
				const time = dayjs(item.done_time)

				const hour = time.hour()
				const minute = Math.floor(time.minute() / 10) * 10

				const day_items = cols[hour]
				const key = time.format('YYYY-MM-DD HH:') + (minute === 0 ? '00' : minute)

				if (typeof day_items[key] === 'string') {
					day_items[key] = {
						todos: [item],
						relative_date: getRelativeMinute(
							'YYYY-MM-DD HH:',
							time,
							minute === 0 ? '00' : minute
						)
					}
				} else {
					day_items[key].todos.push(item)

					if (day_items[key].todos.length > max.count) {
						const next_time = time.add(10, 'minute')
						const next_minute = Math.floor(next_time.minute() / 10) * 10

						max.count = day_items[key].todos.length
						max.time =
							$t('common.today') +
							$t('common.letter_space') +
							time.format('HH:') +
							minute +
							' - ' +
							next_time.format('HH:') +
							next_minute
					}
				}
			})

			this.chart_data = {
				items: cols,
				percent: getPercent(pass / all),
				left,
				total_todos,
				max
			}
		} else if (this.type === 'week') {
			this.current = now.format('YYYY [W]W')

			const days = getDays(this.type, now)

			const cols: ChartItems = days.map(day => {
				return hour_counts.reduce(
					(total, v) => {
						const time = dayjs(day).hour(v)
						const relative_date = getRelativeTime('YYYY-MM-DD HH:00', time)

						total[time.format('YYYY-MM-DD HH:00')] = relative_date

						all += 1

						if (relative_date === 'pass') {
							pass += 1
						} else {
							left += 1
						}

						return total
					},
					{} as Record<string, RelativeDate>
				)
			})

			data_items.forEach(item => {
				const time = dayjs(item.done_time)

				const week = time.dayOfWeek()

				const day_items = cols[week - 1]
				const key = time.format('YYYY-MM-DD HH:00')

				if (typeof day_items[key] === 'string') {
					day_items[key] = {
						todos: [item],
						relative_date: getRelativeTime('YYYY-MM-DD HH:00', time)
					}
				} else {
					day_items[key].todos.push(item)

					if (day_items[key].todos.length > max.count) {
						const next_time = time.add(1, 'hour')

						max.count = day_items[key].todos.length
						max.time = time.format('YYYY-MM-DD HH:00') + ' - ' + next_time.format('HH:00')
					}
				}
			})

			this.chart_data = {
				items: cols,
				percent: getPercent(pass / all),
				left,
				total_todos,
				max
			}
		} else if (this.type === 'month') {
			this.current = now.format('YYYY-MM')

			const { days, all, pass, left } = getMonthDaysWithWeekCol(now)

			const cols: ChartItems = days

			data_items.forEach(item => {
				const time = dayjs(item.done_time)
				const week = time.dayOfWeek()

				const week_items = cols[week - 1]
				const key = time.format('YYYY-MM-DD')

				if (typeof week_items[key] === 'string') {
					week_items[key] = { todos: [item], relative_date: getRelativeTime('YYYY-MM-DD', time) }
				} else {
					week_items[key].todos.push(item)

					if (week_items[key].todos.length > max.count) {
						max.count = week_items[key].todos.length
						max.time = time.format('YYYY-MM-DD')
					}
				}
			})

			this.chart_data = {
				items: cols,
				percent: getPercent(pass / all),
				left,
				total_todos,
				max
			}
		} else if (this.type === 'year') {
			this.current = now.format('YYYY')

			const rows: ChartItems = month_counts.map(month => {
				const date = dayjs(this.current).month(month)

				return getDays('month', date).reduce(
					(total, day) => {
						const relative_date = getRelativeTime('YYYY-MM-DD', day)

						total[day.format('YYYY-MM-DD')] = relative_date

						all += 1

						if (relative_date === 'pass') {
							pass += 1
						} else {
							left += 1
						}

						return total
					},
					{} as Record<string, RelativeDate>
				)
			})

			data_items.forEach(item => {
				const time = dayjs(item.done_time)
				const month = time.month()

				const month_items = rows[month]
				const key = time.format('YYYY-MM-DD')

				if (typeof month_items[key] === 'string') {
					month_items[key] = { todos: [item], relative_date: getRelativeTime('YYYY-MM-DD', time) }
				} else {
					month_items[key].todos.push(item)

					if (month_items[key].todos.length > max.count) {
						max.count = month_items[key].todos.length
						max.time = time.format('YYYY-MM-DD')
					}
				}
			})

			this.chart_data = {
				items: rows,
				percent: getPercent(pass / all),
				left,
				total_todos,
				max
			}
		}
	}

	setIndex(v: Index['index']) {
		this.index = v

		if (v && this.chart_data?.items) {
			const target = this.chart_data.items[v.index][v.key]

			if (typeof target !== 'string') {
				this.data_items = target.todos
			} else {
				this.data_items = []
			}
		} else {
			this.data_items = []
		}
	}

	reset() {
		this.current_date = dayjs()
		this.index = null

		this.query(this.type)
	}

	prev() {
		this.current_date = dayjs(this.current_date).subtract(1, this.type)

		this.query(this.type)
	}

	next() {
		this.current_date = dayjs(this.current_date).add(1, this.type)

		this.query(this.type)
	}

	async share() {
		if (!this.chart_dom) return

		const data_url = await domToPng(this.chart_dom, { quality: 1, scale: 3 })

		downloadImage(`${this.type}-${this.current}-activity`, data_url, 'png')
	}
}
