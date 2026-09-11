import { $applyNodeReplacement } from 'lexical'

import KatexNode from '../Node'

export default (key?:string) => {
	return $applyNodeReplacement(new KatexNode(key)) as KatexNode
}
