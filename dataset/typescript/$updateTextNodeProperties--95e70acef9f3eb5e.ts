import type { TextNode } from 'lexical'

export default <T extends TextNode>(target: T, source: TextNode): T => {
	target.__format = source.__format
	target.__style = source.__style
	target.__mode = source.__mode
	target.__detail = source.__detail

	return target
}
