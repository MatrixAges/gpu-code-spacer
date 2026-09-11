export default async <T>(key: string, default_value: T) => {
	const counts = await $db.kv.count({ selector: { key } }).exec()

	if (counts) return

	await $db.kv.insert({
		key,
		value: JSON.stringify(default_value)
	})
}
