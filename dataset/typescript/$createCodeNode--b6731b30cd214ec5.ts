import { $applyNodeReplacement } from 'lexical'

import CodeNode from '../CodeNode'

import type { IPropsCode } from '../types'

export default (args: IPropsCode) => {
	return $applyNodeReplacement(new CodeNode(args)) as CodeNode
}
