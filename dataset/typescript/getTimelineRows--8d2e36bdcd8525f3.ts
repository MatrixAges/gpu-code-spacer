import type Model from '../model'

import type { Schedule } from '@/types'

export default (timeline_rows: Schedule.Setting['timeline_angles']) => {
	const target = {} as Model['timeline_rows']

	timeline_rows.forEach(item => {
		item.rows.forEach(row_id => (target[row_id] = []))
	})

	return target
}
