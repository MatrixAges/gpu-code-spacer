import { $createParagraphNode, $isParagraphNode, $isTextNode } from 'lexical'

import TableCellNode from '../plugins/Table/TableCellNode'
import TableNode from '../plugins/Table/TableNode'
import TableRowNode from '../plugins/Table/TableRowNode'
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
	$isTableNode,
	$isTableRowNode
} from '../plugins/Table/utils'
import { $convertFromMarkdownString, $convertToMarkdownString } from '../utils'
import transformers from './'

import type { ElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/

const getCells = (v: string) => {
	const match = v.match(TABLE_ROW_REG_EXP)

	if (!match || !match[1]) return

	return match[1].split('|').map(text => {
		const cell = $createTableCellNode({})

		if (text.length) {
			$convertFromMarkdownString(text.replace(/\\n/g, '\n'), transformers, cell, false)
		} else {
			cell.append($createParagraphNode())
		}

		return cell
	})
}

const getTableColumnsSize = (table: TableNode) => {
	const row = table.getFirstChild() as TableRowNode

	return $isTableRowNode(row) ? row.getChildrenSize() : 0
}

export default {
	type: 'element',
	regExp: TABLE_ROW_REG_EXP,
	dependencies: [TableNode, TableRowNode, TableCellNode],
	export: (_node: LexicalNode) => {
		if (!$isTableNode(_node)) return null

		const node = _node as TableNode
		const output = [] as Array<string>
		const rows = node.getChildren() as Array<TableRowNode>
		const cols = node.__cols!

		rows.forEach((row, row_index) => {
			const row_output = [] as Array<string>
			const cells = row.getChildren() as Array<TableCellNode>

			cells.forEach(cell => {
				const text_length = cell.getTextContentSize()

				if (text_length) {
					row_output.push($convertToMarkdownString(transformers, cell, false).replace(/\n/g, '\\n'))
				} else {
					row_output.push(' ')
				}
			})

			output.push(`| ${row_output.join(' | ')} |`)

			if (row_index === 0) {
				const table_line = row_output
					.map((_, col_index) => {
						const col_style = cols[col_index]

						if (col_style) {
							if (col_style.align === 'center') {
								return ':---:'
							}

							if (col_style.align === 'right') {
								return '---:'
							}
						}

						return '---'
					})
					.join(' | ')

				output.push(`| ${table_line} |`)
			}
		})

		return output.join('\n')
	},
	replace(parent, _children, match) {
		if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
			const table = parent.getPreviousSibling() as TableNode

			if (!table || !$isTableNode(table)) return

			const col_align = match[1].replace(/\s/g, '').split('|')

			col_align.forEach((item, index) => {
				if (item) {
					const arr = Array.from(item)
					const target = table.getWritable()

					if (arr.at(0) === ':' && arr.at(-1) === ':') {
						target.__cols![index] = { align: 'center' }
					} else if (arr.at(-1) === ':') {
						target.__cols![index] = { align: 'right' }
					}
				}
			})

			const rows = table.getChildren()

			const last_row = rows[rows.length - 1] as TableRowNode

			if (!last_row || !$isTableRowNode(last_row)) return

			parent.remove()

			return
		}

		const cells = getCells(match[0])

		if (!cells) return

		const rows = [cells]

		let sibling = parent.getPreviousSibling()
		let max_cells = cells.length

		while (sibling) {
			if (!$isParagraphNode(sibling)) {
				break
			}

			if (sibling.getChildrenSize() !== 1) {
				break
			}

			const first_child = sibling.getFirstChild()

			if (!$isTextNode(first_child)) {
				break
			}

			const cells = getCells(first_child.getTextContent())

			if (cells == null) {
				break
			}

			max_cells = Math.max(max_cells, cells.length)

			rows.unshift(cells)

			const prev_sibling = sibling.getPreviousSibling()

			sibling.remove()

			sibling = prev_sibling
		}

		const table = $createTableNode()

		for (const cells of rows) {
			const row = $createTableRowNode()

			table.append(row)

			for (let i = 0; i < max_cells; i++) {
				row.append(i < cells.length ? (cells[i] as TableCellNode) : $createTableCellNode({}))
			}
		}

		const prev_sibling = parent.getPreviousSibling() as TableNode

		if ($isTableNode(prev_sibling) && getTableColumnsSize(prev_sibling) === max_cells) {
			prev_sibling.append(...table.getChildren())

			const first_row = prev_sibling.getFirstChild() as TableRowNode
			const first_row_cells = first_row.getChildren() as Array<TableCellNode>

			first_row_cells.forEach(cell => {
				cell.__is_header = true
			})

			parent.remove()
		} else {
			parent.replace(table)
		}
	}
} as ElementTransformer
