import { id } from '@/utils'

export default async (file_id: string) => {
	return $db.pomo_items.insert({
		file_id,
		sessions: [
			{
				id: id(),
				title: '',
				work_time: 45,
				break_time: 15,
				flow_mode: false
			}
		],
		index: 0,
		current: null,
		going: false,
		work_in: 0,
		break_in: 0,
		continuous_mode: false,
		create_at: new Date().valueOf()
	})
}
