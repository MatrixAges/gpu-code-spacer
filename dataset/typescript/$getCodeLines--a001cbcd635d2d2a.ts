import { $isLineBreakNode, TabNode } from 'lexical'

import { $isCodeNode } from './index'

import type { RangeSelection } from 'lexical'
import type CodeTextNode from '../CodeTextNode'

export default (selection: RangeSelection) => {
	const nodes = selection.getNodes()
	const lines: Array<Array<CodeTextNode | TabNode>> = [[]]

	if (nodes.length === 1 && $isCodeNode(nodes[0])) return lines

	let last_line: Array<CodeTextNode | TabNode> = lines[0]

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]

		if ($isLineBreakNode(node)) {
			if (i !== 0 && last_line.length > 0) {
				last_line = []

				lines.push(last_line)
			}
		} else {
			last_line.push(node as CodeTextNode | TabNode)
		}
	}

	return lines
}
