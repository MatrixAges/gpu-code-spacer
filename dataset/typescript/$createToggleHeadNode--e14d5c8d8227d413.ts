import { $applyNodeReplacement } from 'lexical'

import ToggleHeadNode from '../ToggleHeadNode'

export default (key?: string) => {
	return $applyNodeReplacement(new ToggleHeadNode(key)) as ToggleHeadNode
}
