import { useMemoizedFn } from 'ahooks'
import { throttle } from 'lodash-es'
import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { session } from '@openages/stk/storage'

import type { Stack } from '@/types'

export default (id: string, columns: Stack.Columns) => {
	const { pathname } = useLocation()
	const scroll_key = `_page_scroll_position_${pathname}_${id}`

	const active_ids = useMemo(() => {
		const ids = [] as Array<string>

		columns.forEach(column => {
			column.views.forEach(view => {
				if (view.active) {
					ids.push(view.id)
				}
			})
		})

		return ids
	}, [columns])

	const scrollHandler = useMemoizedFn(
		throttle(() => {
			if (!active_ids.includes(id)) return

			session.setItem(scroll_key, {
				scroll_top: window.scrollY,
				scroll_left: window.scrollX
			})
		}, 900)
	)

	useEffect(() => {
		window.addEventListener('scroll', scrollHandler)

		return () => {
			window.removeEventListener('scroll', scrollHandler)
		}
	}, [id, scroll_key, columns])

	useEffect(() => {
		const position = session.getItem(scroll_key)

		if (!position) return

		window.scrollTo(position?.scroll_left || 0, position?.scroll_top || 0)
	}, [scroll_key])
}
