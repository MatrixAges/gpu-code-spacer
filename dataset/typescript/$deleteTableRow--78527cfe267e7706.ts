import type TableNode from '../TableNode'

export default (table_node: TableNode, target_index: number) => {
	const table_rows = table_node.getChildren()

	table_rows[target_index].remove()

	return table_node
}
