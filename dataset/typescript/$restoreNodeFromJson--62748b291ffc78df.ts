import { $isElementNode } from 'lexical'

import { deepEqual } from '@openages/stk/react'

import type { RegisteredNodes, InternalSerializedNode } from '@/Editor/types'
import type { NodeMap } from 'lexical'

const Index = (json: InternalSerializedNode, register_node_map: RegisteredNodes, update_node_map?: NodeMap) => {
	const node_registed = register_node_map.get(json.type)!
	const node = node_registed.klass.importJSON(json, update_node_map ? true : false)
	const children = json.children

	if ($isElementNode(node) && Array.isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			const child_node = Index(children[i], register_node_map, update_node_map)
			const current_node = update_node_map?.get?.(child_node.__key)

			if (update_node_map && current_node) {
				const current_json = current_node.exportJSON()
				const child_json = current_node.exportJSON()

				if (!deepEqual(current_json, child_json)) {
					current_node.replace(child_node)
				}
			} else {
				node.append(child_node)
			}
		}
	}

	return node
}

export default Index
