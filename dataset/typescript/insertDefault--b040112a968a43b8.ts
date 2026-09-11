import type { Note } from '@/types'

export default async () => {
	const counts = await $db.kv.count({ selector: { key: 'note_settings' } }).exec()

	if (counts) return

	await $db.kv.insert({
		key: 'note_settings',
		value: JSON.stringify({ serif: false, small_text: false, toc: 'default' } as Note.Setting)
	})
}
