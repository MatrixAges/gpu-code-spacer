import type { NodeKey, EditorState } from 'lexical'

export namespace Lexical {
	export interface ArgsUpdateListener {
		dirtyElements: Map<NodeKey, boolean>
		dirtyLeaves: Set<NodeKey>
		editorState: EditorState
		prevEditorState: EditorState
		normalizedNodes: Set<NodeKey>
		tags: Set<string>
	}
}
