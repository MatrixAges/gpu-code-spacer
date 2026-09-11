import type { Schedule } from '@/types'

export default async (file_id: string, data: Partial<Schedule.Setting>) => {
	const module_setting = (await $db.module_setting.findOne({ selector: { file_id } }).exec())!

	const setting = JSON.parse(module_setting.setting) as Schedule.Setting

	await module_setting.incrementalPatch({
		setting: JSON.stringify({ ...setting, ...data })
	})
}
