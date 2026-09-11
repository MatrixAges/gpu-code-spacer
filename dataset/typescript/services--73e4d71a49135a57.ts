import { getCleanTime, getDocItemsData, id } from '@/utils'
import { confirm } from '@/utils/antd'

import type { Schedule, CleanTime } from '@/types'
import type { MangoQuerySelector } from 'rxdb'

export const getTimeBlock = (id: string) => $db.schedule_items.findOne(id).exec()

export const getTimeBlocks = (
	file_id: string,
	selector: MangoQuerySelector<Schedule.Item>,
	filter_tags: Array<string>
) => {
	if (filter_tags.length) selector['tag'] = { $in: filter_tags }

	return $db.schedule_items.find({ selector: { file_id, ...selector } })
}

export const getScheduleItems = () => {
	return $db.todo_items.find({ selector: { schedule: true }, index: 'file_id' })
}

export const addTimeBlock = (file_id: string, args: Partial<Schedule.Item>) => {
	return $db.schedule_items.insert({
		id: id(),
		file_id,
		tag: '',
		text: '',
		todos: [],
		...args
	} as Schedule.Item)
}

export const updateTimeBlock = async (id: string, v: Partial<Schedule.Item>) => {
	const doc = await getTimeBlock(id)

	return doc!.updateCRDT({ ifMatch: { $set: v } })
}

export const removeTimeBlock = async (id: string) => {
	return $db.schedule_items.findOne(id).remove()
}

export const hangleTimeBlock = async (
	file_id: string,
	params: { type: 'counts' | 'remove'; tag?: string; angle_id?: string; row_id?: string }
) => {
	const selector = { file_id } as MangoQuerySelector<Schedule.Item>

	if (params.tag) selector['tag'] = params.tag
	if (params.angle_id) selector['timeline_angle_id'] = params.angle_id
	if (params.row_id) selector['timeline_angle_row_id'] = params.row_id

	if (params.type === 'counts') {
		return $db.schedule_items.count({ selector }).exec()
	} else {
		return $db.schedule_items.find({ selector }).remove()
	}
}

export const cleanByTime = async (file_id: string, v: CleanTime) => {
	const target_time = getCleanTime(v)

	const query = $db.schedule_items.find({
		selector: {
			file_id,
			end_time: { $lte: target_time.valueOf() },
			$or: [
				{ fixed_scale: { $exists: false } },
				{ fixed_scale: { $eq: undefined } },
				{ fixed_scale: { $eq: false } }
			]
		}
	})

	const remove_items = await query.exec()

	const res = await confirm({
		id: file_id,
		title: $t('common.notice'),
		// @ts-ignore
		content: $t('common.clean.confirm_with_date', {
			date: target_time.format('YYYY-MM-DD'),
			counts: remove_items.length
		})
	})

	if (!res || !remove_items.length) return false

	await query.remove()

	await $db.schedule_items.bulkClean(getDocItemsData(remove_items).map(item => item.id))
}
