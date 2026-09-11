import DividerNode from '../plugins/Divider/Node'
import { $createDividerNode, $isDividerNode } from '../plugins/Divider/utils'

import type { ElementTransformer } from '@lexical/markdown'

export default {
	type: 'element',
	regExp: /^(---|\*\*\*|___)\s?$/,
	dependencies: [DividerNode],
	export(node) {
		return $isDividerNode(node) ? '***' : null
	},
	replace(parent, _children, _match, is_import) {
		const node = $createDividerNode()

		if (is_import || parent.getNextSibling() !== null) {
			parent.replace(node)
		} else {
			parent.insertBefore(node)
		}

		node.selectNext()
	}
} as ElementTransformer
