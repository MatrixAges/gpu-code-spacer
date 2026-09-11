import dayjs from 'dayjs'
import { match, P } from 'ts-pattern'

import type { Todo } from '@/types'
import type { RxDocument } from 'rxdb'

export const not_cycle = [
	{ cycle_enabled: { $exists: false } },
	{ cycle_enabled: { $eq: false } },
	{ cycle_enabled: { $eq: undefined } }
]

type ScheduleArgs = Pick<Todo.Todo, 'start_time' | 'end_time'>

const uncycle = async (item: RxDocument<Todo.Todo>, schedule_args?: ScheduleArgs) => {
	const todo_schedule_args = schedule_args ? schedule_args : {}

	return item.updateCRDT({
		ifMatch: {
			$set: {
				status: 'unchecked',
				archive: false,
				archive_time: undefined,
				recycle_time: undefined,
				done_time: undefined,
				...todo_schedule_args
			}
		}
	})
}

const recycle = async (item: RxDocument<Todo.Todo>) => {
	let schedule_args = null as unknown as ScheduleArgs

	if (item.cycle!.type === 'specific' && item.schedule && item.start_time && item.end_time) {
		const recycle_time = dayjs(item.recycle_time)

		schedule_args = match(item.cycle!.scale!)
			.with(P.union('clock', 'weekday'), () => ({
				start_time: dayjs(item.start_time).date(recycle_time.date()).valueOf(),
				end_time: dayjs(item.start_time).date(recycle_time.date()).valueOf()
			}))
			.with('date', () => ({
				start_time: dayjs(item.start_time).month(recycle_time.month()).valueOf(),
				end_time: dayjs(item.start_time).month(recycle_time.month()).valueOf()
			}))
			.with('special', () => ({
				start_time: dayjs(item.start_time).year(recycle_time.year()).valueOf(),
				end_time: dayjs(item.start_time).year(recycle_time.year()).valueOf()
			}))
			.exhaustive()
	}

	return match(item.cycle!)
		.with({ type: 'interval', scale: P.union('minute', 'hour', 'day', 'month', 'year') }, async () => {
			return uncycle(item)
		})
		.with({ type: 'interval', scale: P.union('week', 'quarter') }, async ({ scale }) => {
			const target = scale == 'week' ? dayjs().isoWeekday() : dayjs().quarter()

			if (item.cycle?.exclude?.length) {
				if (!item.cycle.exclude.includes(target)) {
					return uncycle(item)
				}
			}
		})
		.with({ type: 'specific', scale: P.union('clock', 'weekday', 'date', 'special') }, async () => {
			return uncycle(item, schedule_args)
		})
		.exhaustive()
}

export default async (file_id: string) => {
	const cycle_items = await $db.todo_items
		.find({
			selector: {
				file_id,
				type: 'todo',
				status: 'checked',
				recycle_time: {
					$exists: true,
					$ne: undefined,
					$lte: new Date().valueOf()
				}
			}
		})
		.exec()

	await Promise.all(cycle_items.map(item => recycle(item as RxDocument<Todo.Todo>)))
}
