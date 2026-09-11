import { $applyNodeReplacement } from 'lexical'

import RefNode from '../Node'

import type { IPropsRef } from '../types'

export default (args: IPropsRef) => {
	return $applyNodeReplacement(new RefNode(args)) as RefNode
}
