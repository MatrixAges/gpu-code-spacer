import type { Klass, LexicalNode, Transform, LexicalEditor, DOMExportOutput } from 'lexical'
import type { IPropsTextLoader } from './plugins/_TextLoader_/types'
import type { IPropsDataLoader } from './plugins/_NoteLoader_/types'
import type { IPropsLinkEditor } from './plugins/LinkEditor/types'
import type { DOMAttributes } from 'react'

export interface IPropsModal {
	node_key?: string
	onClose: () => void
}

export interface IPropsCommon {
	md?: boolean
}

export interface RegisteredNode {
	transforms: Set<Transform<LexicalNode>>
	klass: Klass<LexicalNode>
	replaceWithKlass: null | Klass<LexicalNode>
	replace: null | ((node: LexicalNode) => LexicalNode)
	exportDOM?: (editor: LexicalEditor, targetNode: LexicalNode) => DOMExportOutput
}

export type RegisteredNodes = Map<string, RegisteredNode>

export interface InternalSerializedNode {
	type: string
	version: number
	children?: Array<InternalSerializedNode>
}

export interface IPropsNote extends IPropsDataLoader {}

export interface IPropsText extends IPropsTextLoader, IPropsLinkEditor {
	id?: HTMLDivElement['id']
	className?: HTMLDivElement['className']
	placeholder?: string
	placeholder_classname?: HTMLDivElement['className']
	linebreak?: boolean
	readonly?: boolean
	disable_textbar?: boolean
	setRef?: (v: HTMLDivElement) => void
	onContextMenu?: DOMAttributes<HTMLDivElement>['onContextMenu']
	onClick?: DOMAttributes<HTMLDivElement>['onClick']
}
