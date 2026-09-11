import type { SerializedLexicalNode, Spread } from 'lexical'

export interface IPropsComponent {
	node_key?: string
}

export type SerializedDividerNode = Spread<IPropsComponent, SerializedLexicalNode>
