import { $createKatexNode } from './index'

import type { DOMConversionOutput } from 'lexical'

export default (el: HTMLElement): DOMConversionOutput | null => {
	const value = atob(el.getAttribute('lexical-katex-value') || '')
	const inline = el.getAttribute('lexical-katex-inline') === 'true'

	if (value) {
		const node = $createKatexNode({ value, inline })

		return { node }
	}

	return null
}
