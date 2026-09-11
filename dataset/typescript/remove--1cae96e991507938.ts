import type { Extend } from '@/types'

const Index = async (focusing_item: Extend.DirTree.TransformedItem) => {
	await $db.note_items.find({ selector: { file_id: focusing_item.id } }).remove()
}

export default Index
