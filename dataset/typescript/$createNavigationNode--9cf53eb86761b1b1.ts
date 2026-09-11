import { $applyNodeReplacement } from 'lexical'

import NavigationNode from '../Node'

export default (key?:string) => {
	return $applyNodeReplacement(new NavigationNode(key)) as NavigationNode
}
