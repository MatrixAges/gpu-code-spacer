import { local } from '@openages/stk/storage'

import type { Extend } from '@/types'

const Index = async (focusing_item: Extend.DirTree.TransformedItem) => {
	local.removeItem(`${focusing_item.id}_todo_current_angle_id`)

	await $db.module_setting.findOne({ selector: { file_id: focusing_item.id } }).remove()
	await $db.todo_items.find({ selector: { file_id: focusing_item.id } }).remove()
}

export default Index
