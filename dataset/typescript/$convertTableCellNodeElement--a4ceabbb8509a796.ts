import { $createParagraphNode, $isElementNode, $isLineBreakNode, $isTextNode } from 'lexical'
import { $createTableCellNode, $isTableCellNode } from './index'

import type { DOMConversionOutput } from 'lexical'

export default (dom: Node): DOMConversionOutput => {
	const el = dom as HTMLTableCellElement
	const node_name = el.nodeName.toLowerCase()

	const table_cell_node = $createTableCellNode({
		is_header: node_name === 'th',
		row_span: el.rowSpan,
		col_span: el.colSpan
	})

	const style = el.style

	const text_decoration = style.textDecoration.split(' ')

	const has_bold_font_weight = style.fontWeight === '700' || style.fontWeight === 'bold'
	const has_italic_font_style = style.fontStyle === 'italic'
	const has_underline_text_decoration = text_decoration.includes('underline')
	const has_linethrough_text_decoration = text_decoration.includes('line-through')

	return {
		after: child_lexical_nodes => {
			if (!child_lexical_nodes.length) child_lexical_nodes.push($createParagraphNode())

			return child_lexical_nodes
		},
		forChild: (lexical_node, parent_lexical_node) => {
			if ($isTableCellNode(parent_lexical_node!) && !$isElementNode(lexical_node)) {
				const paragraph_node = $createParagraphNode()

				if ($isLineBreakNode(lexical_node) && lexical_node.getTextContent() === '\n') return null

				if ($isTextNode(lexical_node)) {
					if (has_bold_font_weight) lexical_node.toggleFormat('bold')
					if (has_italic_font_style) lexical_node.toggleFormat('italic')
					if (has_underline_text_decoration) lexical_node.toggleFormat('underline')
					if (has_linethrough_text_decoration) lexical_node.toggleFormat('strikethrough')
				}

				paragraph_node.append(lexical_node)

				return paragraph_node
			}

			return lexical_node
		},
		node: table_cell_node
	}
}
