import { $isRangeSelection } from 'lexical'

import { $isTableSelection } from './index'

import type { BaseSelection } from 'lexical'
import type TableNode from '../TableNode'
import type TableSelection from '../TableSelection'

export default (selection: BaseSelection, table_node: TableNode) => {
	if ($isRangeSelection(selection) || $isTableSelection(selection)) {
		const is_anchor_inside = table_node.isParentOf((selection as TableSelection).anchor.getNode())
		const is_focus_inside = table_node.isParentOf((selection as TableSelection).focus.getNode())

		return is_anchor_inside && is_focus_inside
	}

	return false
}
