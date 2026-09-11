import { $applyNodeReplacement } from 'lexical'

import ImageNode from '../Node'

import type { IPropsImage } from '../types'

export default (args: IPropsImage) => {
	return $applyNodeReplacement(new ImageNode(args)) as ImageNode
}
