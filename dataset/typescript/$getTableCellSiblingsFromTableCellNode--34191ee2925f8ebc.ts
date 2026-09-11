import { $findTableNode } from './index'

import type { Table } from '../types'
import type TableCellNode from '../TableCellNode'

export default (table_cell_node: TableCellNode, table: Table) => {
	const table_node = $findTableNode(table_cell_node)
	const { x, y } = table_node.getCordsFromCellNode(table_cell_node, table)

	return {
		above: table_node.getCellNodeFromCords(x, y - 1, table),
		below: table_node.getCellNodeFromCords(x, y + 1, table),
		left: table_node.getCellNodeFromCords(x - 1, y, table),
		right: table_node.getCellNodeFromCords(x + 1, y, table)
	}
}
