import { $getNodeByKey, $isRootNode } from 'lexical'

import { $getTopLevelNode } from '@/Editor/utils'

import type { NodeMap } from 'lexical'

const Index = (key: string, prev_map: NodeMap): string | undefined => {
	const node = prev_map.get(key)

	if (!node) return

	const parent = $getNodeByKey(node.__parent!)

	if (parent) {
		if ($isRootNode(parent)) return key

		return $getTopLevelNode(parent).getKey()
	} else {
		return Index(node.__parent!, prev_map)
	}
}

export default Index
