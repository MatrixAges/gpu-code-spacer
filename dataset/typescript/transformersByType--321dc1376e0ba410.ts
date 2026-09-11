import indexBy from './indexBy'

import type { ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer } from '@lexical/markdown'

export default (transformers: Array<Transformer>) => {
	const byType = indexBy(transformers, t => t.type)

	return {
		element: (byType.element || []) as Array<ElementTransformer>,
		textFormat: (byType['text-format'] || []) as Array<TextFormatTransformer>,
		textMatch: (byType['text-match'] || []) as Array<TextMatchTransformer>
	}
}
