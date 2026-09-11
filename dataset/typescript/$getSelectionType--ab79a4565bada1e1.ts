import { $isNodeSelection, $isRangeSelection } from 'lexical'

import { $isTableSelection } from '../plugins/Table/utils'

import type { BaseSelection } from 'lexical'

export default (selection: BaseSelection) => {
	if ($isRangeSelection(selection)) return 'range'
	if ($isNodeSelection(selection)) return 'node'
	if ($isTableSelection(selection)) return 'table'

	return ''
}
