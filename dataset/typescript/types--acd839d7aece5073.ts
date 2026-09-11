import type { SerializedLexicalNode, Spread } from 'lexical'

import type { MouseEvent } from 'react'

export interface IPropsMermaid {
	value: string
	node_key?: string
}

export interface IPropsRender extends IPropsMermaid {
	onClick?: (e: MouseEvent<HTMLSpanElement>) => void
}

export type SerializedMermaidNode = Spread<IPropsMermaid, SerializedLexicalNode>
