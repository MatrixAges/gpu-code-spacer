import { useMemoizedFn } from 'ahooks'
import { debounce } from 'lodash-es'
import { useEffect, useState } from 'react'

export default (callback: () => void, visible: boolean) => {
	const [node, setRef] = useState<HTMLDivElement | null>(null)

	const handler = useMemoizedFn(() => {
		if (!node?.parentElement) return

		const target = node.parentElement

		if (target.scrollTop >= target.scrollHeight - target.clientHeight - 3) {
			callback()
		}
	})

	useEffect(() => {
		if (!visible) return
		if (!node?.parentElement) return

		const parent = node.parentElement
		const _hander = debounce(handler, 300)

		parent.addEventListener('scroll', _hander)

		return () => parent.removeEventListener('scroll', _hander)
	}, [visible, node])

	return { setRef }
}
