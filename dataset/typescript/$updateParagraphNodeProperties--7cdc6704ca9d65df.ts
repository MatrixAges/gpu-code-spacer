import type { ParagraphNode } from 'lexical'

export default <T extends ParagraphNode>(target: T, source: ParagraphNode): T => {
	target.__textFormat = source.__textFormat

	return target
}
