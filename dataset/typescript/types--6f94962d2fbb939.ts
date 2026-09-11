import type { SerializedLexicalNode, Spread } from 'lexical'

import type { MouseEvent } from 'react'

export interface IPropsKatex {
	value: string
	inline?: boolean
	node_key?: string
}

export interface IPropsRender extends IPropsKatex {
	onClick?: (e: MouseEvent<HTMLSpanElement>) => void
}

export type SerializedKatexNode = Spread<IPropsKatex, SerializedLexicalNode>
