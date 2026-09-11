import { useMemoizedFn } from 'ahooks'
import { useEffect, useRef, useState } from 'react'

import type Model from '../model'

interface Args {
	day_index?: number
	angle_row_id?: string
	step?: number
	timeblock_index: number
	changeTimeBlockLength: Model['changeTimeBlockLength']
}

export default (args: Args) => {
	const { day_index, angle_row_id, step, timeblock_index, changeTimeBlockLength } = args
	const ref = useRef<HTMLDivElement>(null)
	const changed = useRef(0)
	const [changing, setChanging] = useState(false)
	const timeline = angle_row_id !== undefined

	useEffect(() => {
		changed.current = 0
	}, [changing])

	const start = useMemoizedFn(() => {
		setChanging(true)

		document.body.style.cursor = timeline ? 'col-resize' : 'row-resize'
	})

	const stop = useMemoizedFn(() => {
		setChanging(false)

		document.body.style.removeProperty('cursor')
	})

	const setWidth = useMemoizedFn((e: MouseEvent) => {
		if (!changing) return

		let move = 0

		if (timeline) {
			move = e.clientX - changed.current

			if (changed.current === 0) return (changed.current = e.clientX)
			if (Math.abs(move) < step!) return

			changed.current = 0
		} else {
			move = e.clientY - changed.current

			if (changed.current === 0) return (changed.current = e.clientY)
			if (Math.abs(move) < 16) return

			changed.current = 0
		}

		changeTimeBlockLength({
			day_index,
			angle_row_id,
			timeblock_index,
			step: move > 0 ? 1 : -1
		})
	})

	useEffect(() => {
		if (!changeTimeBlockLength) return

		const drag_ref = ref.current!

		drag_ref.addEventListener('mousedown', start)
		document.addEventListener('mouseup', stop)

		return () => {
			drag_ref.removeEventListener('mousedown', start)
			document.removeEventListener('mouseup', stop)
		}
	}, [changeTimeBlockLength])

	useEffect(() => {
		if (changing) document.addEventListener('mousemove', setWidth)

		return () => document.removeEventListener('mousemove', setWidth)
	}, [changing])

	return { drag_ref: ref, changing }
}
