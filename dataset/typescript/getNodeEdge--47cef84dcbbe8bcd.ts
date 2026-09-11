import type { Node, Edge } from '@xyflow/react'

import type { IPropsMindmap } from '@/modules/todo/types'

const position = { x: 0, y: 0 }
const edge_type = 'smoothstep'

export default (args: Pick<IPropsMindmap, 'file_id' | 'name' | 'kanban_items'>) => {
	const { file_id, name, kanban_items } = args
	const nodes = [{ id: file_id, data: { label: name }, position, className: 'root_node' }] as Array<Node>
	const edges = [] as Array<Edge>

	Object.keys(kanban_items).forEach(angle_id => {
		if (kanban_items[angle_id].items.length) {
			nodes.push({
				id: angle_id,
				data: { label: kanban_items[angle_id].dimension.value.text },
				position,
				className: 'angle_node'
			})

			edges.push({
				id: `${file_id}|${angle_id}`,
				source: file_id,
				target: angle_id,
				type: edge_type
			})

			kanban_items[angle_id].items.forEach((item, index) => {
				nodes.push({
					type: 'TodoItem',
					id: item.id,
					data: {
						item,
						index,
						dimension_id: angle_id
					},
					position,
					className: 'dynamic_node'
				})

				edges.push({
					id: `${angle_id}|${item.id}`,
					source: angle_id,
					target: item.id,
					type: edge_type
				})

				if (item.children?.length) {
					item.children.forEach((child, children_index) => {
						nodes.push({
							type: 'ChildrenItem',
							id: child.id,
							data: {
								item: child,
								index,
								children_index,
								dimension_id: angle_id
							},
							position,
							className: 'dynamic_node'
						})

						edges.push({
							id: `${item.id}|${child.id}`,
							source: item.id,
							target: child.id,
							type: edge_type
						})
					})
				}
			})
		}
	})

	return { nodes, edges }
}
