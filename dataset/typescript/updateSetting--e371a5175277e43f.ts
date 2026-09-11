import type { Note } from '@/types'

export default async (data: Partial<Note.Setting>) => {
	const doc = (await $db.kv.findOne({ selector: { key: 'note_settings' } }).exec())!

	const setting = JSON.parse(doc.value) as Note.Setting

	await doc.incrementalPatch({
		value: JSON.stringify({ ...setting, ...data })
	})
}
