import type { App, DirTree } from '@/types'
import type { ArgsInsert, ArgsRemove, ArgsUpdate } from './types/services'

export const getQuery = (module: App.ModuleType) => {
	return $db.dirtree_items.find({ selector: { module: module } })
}

export const query = async (module: App.ModuleType) => {
	return getQuery(module).exec()
}

export const insert = async (args: ArgsInsert) => {
	const { actions, item, effect_items } = args

	if (item.type === 'file' && actions.insert) {
		await actions.insert(item.id)
	}

	await $db.dirtree_items.insert({ ...item, create_at: new Date().valueOf() })

	await updateItems(effect_items)
}

export const remove = async (args: ArgsRemove) => {
	const { module, focusing_item, actions, current_item_id, remove_items, effect_items } = args

	const removeItem = async (item: DirTree.Item) => {
		if (item.id === current_item_id) $app.Event.emit(`${module}/dirtree/removeCurrentItem`)
		if (item.type === 'dir') $app.Event.emit(`${module}/dirtree/removeOpenFolder`, item.id)

		if (item.type === 'file') {
			await $app.Event.emit('global.stack.removeFile', item.id)

			$app.Event.emit('global.app.removeFile', item.id)

			await actions.remove(item)
		}

		await $db.dirtree_items.findOne(item.id).remove()
	}

	await removeItem(focusing_item)

	if (remove_items.length) {
		await Promise.all(remove_items.map(item => removeItem(item)))
	}

	await updateItems(effect_items)
}

export const update = async (args: ArgsUpdate) => {
	const { focusing_item, item } = args
	const target_id = item.id ?? focusing_item?.id

	const doc = await $db.dirtree_items.findOne(target_id).exec()

	if (!doc) return

	await doc.updateCRDT({ ifMatch: { $set: item } })

	if (doc.type === 'dir') return

	await $app.Event.emit('global.stack.updateFile', {
		...item,
		id: target_id
	})
}

export const updateItems = async (effect_items: DirTree.Items) => {
	if (effect_items.length) {
		await Promise.all(
			effect_items.map(async item => {
				const doc = await $db.dirtree_items.findOne(item.id).exec()

				if (!doc) return

				return doc.updateCRDT({
					ifMatch: {
						$set: {
							pid: item.pid,
							prev_id: item.prev_id,
							next_id: item.next_id
						}
					}
				})
			})
		)
	}
}
