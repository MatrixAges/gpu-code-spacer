import {
	$getSelection,
	$isRangeSelection,
	INDENT_CONTENT_COMMAND,
	INSERT_TAB_COMMAND,
	OUTDENT_CONTENT_COMMAND
} from 'lexical'

import { $getCodeLines, $isCodeNode, $isSelectionInCode, getFirstCodeNodeOfLine, getLastCodeNodeOfLine } from './index'

import type { PointType } from 'lexical'

export default (shift_key: boolean) => {
	const selection = $getSelection()

	if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) return null

	const indent_or_outdent = !shift_key ? INDENT_CONTENT_COMMAND : OUTDENT_CONTENT_COMMAND
	const tab_or_outdent = !shift_key ? INSERT_TAB_COMMAND : OUTDENT_CONTENT_COMMAND
	const code_lines = $getCodeLines(selection)

	if (code_lines.length > 1) return indent_or_outdent

	const selection_nodes = selection.getNodes()
	const first_node = selection_nodes[0]

	if ($isCodeNode(first_node)) return indent_or_outdent

	const first_of_line = getFirstCodeNodeOfLine(first_node)
	const last_of_line = getLastCodeNodeOfLine(first_node)
	const anchor = selection.anchor
	const focus = selection.focus

	let selection_first: PointType
	let selection_last: PointType

	if (focus.isBefore(anchor)) {
		selection_first = focus
		selection_last = anchor
	} else {
		selection_first = anchor
		selection_last = focus
	}

	if (
		first_of_line !== null &&
		last_of_line !== null &&
		selection_first.key === first_of_line.getKey() &&
		selection_first.offset === 0 &&
		selection_last.key === last_of_line.getKey() &&
		selection_last.offset === last_of_line.getTextContentSize()
	) {
		return indent_or_outdent
	}

	return tab_or_outdent
}
