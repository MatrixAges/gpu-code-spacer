import type { VisibilityContext } from 'react-horizontal-scrolling-menu'
import type { ContextType, WheelEvent } from 'react'

export default (scroller: ContextType<typeof VisibilityContext>, ev: WheelEvent) => {
	const is_thouchpad = Math.abs(ev.deltaX) !== 0 || Math.abs(ev.deltaY) < 15

	if (is_thouchpad) return ev.stopPropagation()

	if (ev.deltaY > 0) {
		scroller.scrollNext()
	}

	if (ev.deltaY < 0) {
		scroller.scrollPrev()
	}
}
