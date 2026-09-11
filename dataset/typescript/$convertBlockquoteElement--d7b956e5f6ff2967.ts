import { setNodeIndentFromDOM } from 'lexical'
import { $createQuoteNode } from './index'

import type { ElementFormatType } from 'lexical'

export default (el: HTMLElement) => {
	const node = $createQuoteNode()

	setNodeIndentFromDOM(el, node)

	if (el?.style?.textAlign) node.setFormat(el.style.textAlign as ElementFormatType)

	return { node }
}
