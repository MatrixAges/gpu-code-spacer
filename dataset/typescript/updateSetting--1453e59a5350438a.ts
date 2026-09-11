export default async <T>(file_id: string, data: Partial<T>) => {
	const module_setting = (await $db.module_setting.findOne({ selector: { file_id } }).exec())!

	const setting = JSON.parse(module_setting.setting) as T

	await module_setting.incrementalPatch({
		setting: JSON.stringify({ ...setting, ...data })
	})
}
