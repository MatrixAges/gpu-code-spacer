import { $findMatchingParent } from '@lexical/utils'

import type { LexicalNode } from 'lexical'

export default (node: LexicalNode, findFn: (n: LexicalNode) => boolean) => {
	if (findFn(node)) return node

	const target = $findMatchingParent(node, findFn)!

	return findFn(target) ? target : null
}
