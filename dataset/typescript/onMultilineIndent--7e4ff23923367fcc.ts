import {
	$createTabNode,
	$getSelection,
	$isLineBreakNode,
	$isRangeSelection,
	$isTabNode,
	INDENT_CONTENT_COMMAND,
	TabNode
} from 'lexical'

import CodeTextNode from '../CodeTextNode'
import { $getCodeLines, $isCodeNode, $isSelectionInCode, getFirstCodeNodeOfLine } from './index'

import type { LexicalCommand } from 'lexical'

export default (type: LexicalCommand<void>) => {
	const selection = $getSelection()

	if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) return false

	const code_lines = $getCodeLines(selection)
	const code_lines_length = code_lines.length

	if (code_lines.length > 1) {
		for (let i = 0; i < code_lines_length; i++) {
			const line = code_lines[i]

			if (line.length > 0) {
				let first_of_line = line[0]

				if (i === 0) {
					first_of_line = getFirstCodeNodeOfLine(first_of_line) as CodeTextNode | TabNode
				}

				if (first_of_line !== null) {
					if (type === INDENT_CONTENT_COMMAND) {
						first_of_line.insertBefore($createTabNode())
					} else if ($isTabNode(first_of_line)) {
						first_of_line.remove()
					}
				}
			}
		}

		return true
	}

	const selection_nodes = selection.getNodes()
	const first_node = selection_nodes[0]

	if ($isCodeNode(first_node)) {
		if (type === INDENT_CONTENT_COMMAND) {
			selection.insertNodes([$createTabNode()])
		}

		return true
	}

	const first_of_line = getFirstCodeNodeOfLine(first_node)

	if (type === INDENT_CONTENT_COMMAND) {
		if ($isLineBreakNode(first_of_line)) {
			first_of_line.insertAfter($createTabNode())
		} else {
			first_of_line.insertBefore($createTabNode())
		}
	} else if ($isTabNode(first_of_line)) {
		first_of_line.remove()
	}

	return true
}
