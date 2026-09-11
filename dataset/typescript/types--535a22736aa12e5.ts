import type { SerializedLexicalNode, Spread } from 'lexical'

import type { App } from '@/types'

export interface IPropsRef {
	module: 'file' | App.ModuleType
	id: string
	node_key?: string
}

export type SerializedRefNode = Spread<IPropsRef, SerializedLexicalNode>
