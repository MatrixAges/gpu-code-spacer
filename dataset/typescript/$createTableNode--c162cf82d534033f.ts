import { $applyNodeReplacement } from 'lexical'

import TableNode from '../TableNode'

import type { IPropsTableNode } from '../types'

export default (args?: IPropsTableNode) => {
	return $applyNodeReplacement(new TableNode(args || {})) as TableNode
}
