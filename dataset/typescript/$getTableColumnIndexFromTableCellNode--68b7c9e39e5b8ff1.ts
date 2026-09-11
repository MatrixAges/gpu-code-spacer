import { $findRowNode } from './index'

import type TableCellNode from '../TableCellNode'

export default (table_cell_node: TableCellNode) => {
	return $findRowNode(table_cell_node)
		.getChildren()
		.findIndex(n => n.is(table_cell_node))
}
