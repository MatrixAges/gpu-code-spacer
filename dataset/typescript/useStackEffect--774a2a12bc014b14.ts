import { useMemoizedFn } from 'ahooks'
import { useInsertionEffect, useLayoutEffect, useRef } from 'react'

import { useStackId } from '@/hooks'
import { deepEqual } from '@openages/stk/react'

import type { DependencyList } from 'react'

interface Args {
	mounted: (args: {
		setDom: (v: HTMLDivElement) => void
	}) => void
	unmounted?: () => void
	deps: DependencyList
	stack_id?: string
}

export default (args: Args) => {
	const { mounted, unmounted, deps, stack_id } = args
	const ref_dom = useRef<HTMLDivElement | null>(null)
	const ref_deps = useRef<DependencyList>()
	const id = useStackId() || stack_id

	const setDom = useMemoizedFn((v: HTMLDivElement) => {
		if (!v) return

		ref_dom.current = v
	})

	useInsertionEffect(() => {
		if (deepEqual(ref_deps.current, deps)) return

		ref_deps.current = deps

		mounted({ setDom })
	}, deps)

	useLayoutEffect(() => {
		if (!unmounted) return
		if (!id) return unmounted

		return () => {
			setTimeout(() => {
				if (ref_dom.current?.isConnected) {
					const offs = $stack_offs.get(id)

					if (offs) {
						offs.add(unmounted)
					} else {
						const set = new Set<() => void>()

						set.add(unmounted)

						$stack_offs.set(id, set)
					}
				} else {
					unmounted()
				}
			}, 0)
		}
	}, [id])

	return { setDom }
}
