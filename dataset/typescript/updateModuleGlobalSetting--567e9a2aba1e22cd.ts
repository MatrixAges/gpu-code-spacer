import { merge } from 'ts-deepmerge'

export default async (key: string, data: any) => {
	const doc = (await $db.kv.findOne({ selector: { key } }).exec())!

	const setting = JSON.parse(doc.value)

	await doc.incrementalPatch({
		value: JSON.stringify(merge(setting, data))
	})
}
