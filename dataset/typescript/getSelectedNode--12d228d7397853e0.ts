import { $isAtNodeEnd } from '@lexical/selection'

import type { RangeSelection } from 'lexical'

export default (selection: RangeSelection) => {
	const anchor = selection.anchor
	const focus = selection.focus
	const anchor_node = selection.anchor.getNode()
	const focus_node = selection.focus.getNode()

	if (anchor_node === focus_node) return anchor_node

	const is_backward = selection.isBackward()

	return $isAtNodeEnd(is_backward ? focus : anchor) ? anchor_node : focus_node
}
