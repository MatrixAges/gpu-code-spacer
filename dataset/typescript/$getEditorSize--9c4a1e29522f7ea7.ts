import { $getRoot } from 'lexical'

import type { LexicalEditor } from 'lexical'

export default (editor: LexicalEditor) => {
	if (!editor) return 0

	return editor.getEditorState().read(() => $getRoot().getTextContentSize())
}
