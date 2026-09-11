import { $getNodeByKey } from 'lexical'

import { updateCodeGutter } from './index'

import type { LexicalEditor, NodeMutation } from 'lexical'
import type CodeNode from '../CodeNode'

export default (editor: LexicalEditor, mutations: Map<string, NodeMutation>) => {
	editor.update(() => {
		for (const [key, type] of mutations) {
			if (type !== 'destroyed') {
				const node = $getNodeByKey(key)

				if (node) {
					updateCodeGutter(node as CodeNode, editor)
				}
			}
		}
	})
}
