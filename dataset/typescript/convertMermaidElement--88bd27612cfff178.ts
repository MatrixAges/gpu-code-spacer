import { $createMermaidNode } from './index'

import type { DOMConversionOutput } from 'lexical'

export default (el: HTMLElement): DOMConversionOutput | null => {
	const value = atob(el.getAttribute('lexical-mermaid-value') || '')

	if (value) {
		const node = $createMermaidNode({ value })

		return { node }
	}

	return null
}
