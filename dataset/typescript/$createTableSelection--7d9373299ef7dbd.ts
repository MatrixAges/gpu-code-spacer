import { $createPoint } from 'lexical'

import TableSelection from '../TableSelection'

export default () => {
	const anchor = $createPoint('root', 0, 'element')
	const focus = $createPoint('root', 0, 'element')

	return new TableSelection('root', anchor, focus)
}
