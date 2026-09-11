import TableObserver from '../TableObserver'
import { LEXICAL_ELEMENT_KEY } from './index'

import type { HTMLTableElementWithWithTableSelectionState } from '../types'

export default (table_element: HTMLTableElementWithWithTableSelectionState) => {
	return table_element[LEXICAL_ELEMENT_KEY] as TableObserver
}
