import type { SerializedElementNode, SerializedTextNode as _SerializedTextNode, Spread } from 'lexical'

import type { BundledLanguage } from 'shiki'

export interface IPropsCode {
	lang?: BundledLanguage
	node_key?: string
}

export interface IPropsCodeText {
	text: string
	color?: string
	node_key?: string
}

export type SerializedCodeNode = Spread<IPropsCode, SerializedElementNode>
export type SerializedCodeTextNode = Spread<IPropsCodeText, _SerializedTextNode>
