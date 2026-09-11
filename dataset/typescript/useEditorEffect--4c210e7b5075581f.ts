import { useMemoizedFn } from 'ahooks'
import { useLayoutEffect, useRef } from 'react'

import { useStackId } from '@/hooks'
import { deepEqual } from '@openages/stk/react'

import type { DependencyList } from 'react'
import type { LexicalEditor } from 'lexical'

interface Args {
	mounted: () => void
	unmounted?: () => void
	editor: LexicalEditor
	deps: DependencyList
}

export default (args: Args) => {
	const { mounted, unmounted, editor, deps } = args
	const ref_dom = useRef<HTMLDivElement | null>(null)
	const ref_deps = useRef<DependencyList>()
	const id = useStackId()

	const setDom = useMemoizedFn((v: HTMLDivElement) => {
		if (!v) return

		ref_dom.current = v
	})

	useLayoutEffect(() => {
		if (deepEqual(ref_deps.current, deps)) return

		ref_deps.current = deps

		setDom(editor.getRootElement() as HTMLDivElement)
		mounted()
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
}
