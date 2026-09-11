import { $applyNodeReplacement } from 'lexical'

import KatexNode from '../Node'

import type { IPropsKatex } from '../types'

export default (args: IPropsKatex) => {
	return $applyNodeReplacement(new KatexNode(args)) as KatexNode
}
