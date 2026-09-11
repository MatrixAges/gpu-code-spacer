import type { Pomo } from '@/types'

export const getPomo = (id: string) => {
	return $db.pomo_items.findOne({ selector: { file_id: id } })
}

export const update = async (id: string, v: Partial<Pomo.Item>) => {
	const doc = (await getPomo(id).exec())!

	return doc.incrementalPatch(v)
}
