import { $applyNodeReplacement } from 'lexical'

import ToggleNode from '../ToggleNode'

import type { IPropsToggle } from '../types'

export default (args: IPropsToggle) => {
	return $applyNodeReplacement(new ToggleNode(args)) as ToggleNode
}
