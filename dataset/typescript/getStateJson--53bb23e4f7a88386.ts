import type { Note } from '@/types'
import type { SerializedEditorState } from 'lexical'

export default (nodes: Array<Note.Item>, gather: (key: Note.Item['id']) => void) => {
	let head_id: string | undefined
	let effect_items = [] as Array<Note.Item>

	const next_ids = new Set()

	const node_map = nodes.reduce((total, item) => {
		total.set(item.id, item)

		gather(item.id)

		if (!item.prev) head_id = item.id

		if (item.next) next_ids.add(item.next)

		return total
	}, new Map<string, Note.Item>())

	if (!head_id) {
		const node_ids = Object.keys(node_map)

		head_id = node_ids.find(id => !next_ids.has(id))

		if (head_id) {
			const head_item = node_map.get(head_id)!
			const target_head_item = { ...head_item, prev: undefined }

			node_map.set(head_id, target_head_item)

			effect_items = [target_head_item]
		} else {
			const target = sortLostTree(nodes, node_map)

			head_id = target.head_id
			effect_items = target.nodes
		}
	}

	if (!head_id) return null

	const state = {
		root: {
			children: [],
			direction: null,
			format: '',
			indent: 0,
			type: 'root',
			key: 'root',
			version: 1
		}
	} as SerializedEditorState

	let current_node_id = head_id

	if (!node_map.get(head_id)?.next) {
		const target = sortLostTree(nodes, node_map)

		current_node_id = target.head_id
		effect_items = target.nodes
	}

	while (current_node_id) {
		const node = node_map.get(current_node_id) as Note.Item

		state.root.children.push(JSON.parse(node.content))

		if (!node.next) break

		if (node_map.get(node.next)) {
			current_node_id = node.next
		} else {
			const broken_next = nodes.find(item => item.prev === node.next)

			if (broken_next) {
				const target_node = { ...node, next: broken_next.id }
				const target_next = { ...broken_next, prev: current_node_id }

				node_map.set(current_node_id, target_node)
				node_map.set(broken_next.id, target_next)

				current_node_id = broken_next.id

				effect_items.push(target_node, target_next)
			} else {
				const target = sortLostTree(nodes, node_map)

				current_node_id = target.head_id
				effect_items = target.nodes

				state.root.children = []
			}
		}
	}

	return { state, effect_items }
}

const sortLostTree = (tree: Array<Note.Item>, node_map: Map<string, Note.Item>) => {
	let head_id = ''

	const nodes = tree.map((item, index) => {
		if (index === 0) {
			head_id = item.id
			item.prev = undefined
		}

		item.next = undefined

		const next = tree[index + 1]

		if (next) {
			item.next = next.id
			next.prev = item.id

			node_map.set(item.id, item)
			node_map.set(next.id, next)
		}

		return item
	})

	return { head_id, nodes }
}
