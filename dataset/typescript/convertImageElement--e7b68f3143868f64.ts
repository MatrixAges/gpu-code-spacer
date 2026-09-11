import { $getEditor, $isParagraphNode } from 'lexical'

import { $createImageNode } from './index'

import type { DOMConversionOutput } from 'lexical'

export default (dom: Node) => {
	const img = dom as HTMLImageElement

	if (img.src.startsWith('file:///')) return null

	const { src, alt } = img

	const node = $createImageNode({ src, width: 'auto', height: 'auto', alt })

	return {
		node,
		after: nodes => {
			$getEditor().update(() => {
				const parent = node.getTopLevelElement()

				if ($isParagraphNode(parent) && parent.getChildren().length === 1) {
					parent.replace(node)
				}
			})

			return nodes
		}
	} as DOMConversionOutput
}
