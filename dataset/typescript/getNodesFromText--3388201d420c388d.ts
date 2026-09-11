import { $createParagraphNode, createEditor } from 'lexical'

import { note_nodes } from '@/Editor/nodes'
import transformers from '@/Editor/transformers'
import { $convertFromMarkdownString } from '@/Editor/utils'

export default (text: string) => {
	const editor = createEditor({ nodes: note_nodes })
	const container = $createParagraphNode()

	editor._headless = true

	$convertFromMarkdownString(text, transformers, container, false)

	return container.getChildren()
}
