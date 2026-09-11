import { $applyNodeReplacement } from 'lexical'

import CodeTextNode from '../CodeTextNode'

import type { IPropsCodeText } from '../types'

export default (args: IPropsCodeText) => {
	return $applyNodeReplacement(new CodeTextNode(args)) as CodeTextNode
}
