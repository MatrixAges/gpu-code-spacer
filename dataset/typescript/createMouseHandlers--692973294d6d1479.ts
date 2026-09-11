import { throttle } from 'lodash-es'

import { getDomSelection, isMouseDownOnEvent } from '@/Editor/utils'

import TableObserver from '../TableObserver'
import { getDOMCellFromTarget } from './index'

export default (observer: TableObserver) => {
	const onMouseMove = throttle((e: MouseEvent) => {
		setTimeout(() => {
			if (!isMouseDownOnEvent(e) && observer.selecting) {
				observer.selecting = false

				window.removeEventListener('mouseup', onMouseUp)
				window.removeEventListener('mousemove', onMouseMove)

				return
			}

			const focus_cell = getDOMCellFromTarget(e.target as HTMLElement)

			if (focus_cell && (observer.anchor_x !== focus_cell.x || observer.anchor_y !== focus_cell.y)) {
				e.preventDefault()

				const dom_selection = getDomSelection(window)

				if (dom_selection) dom_selection.removeAllRanges()

				observer.setFocusCellForSelection(focus_cell)
			}
		}, 0)
	}, 120)

	const onMouseUp = () => {
		observer.selecting = false

		window.removeEventListener('mouseup', onMouseUp)
		window.removeEventListener('mousemove', onMouseMove)
	}

	return { onMouseMove, onMouseUp }
}
