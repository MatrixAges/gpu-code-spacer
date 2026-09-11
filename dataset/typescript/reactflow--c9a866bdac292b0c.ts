import { deepEqual } from '@openages/stk/react'

import type { GeneralHelpers } from '@xyflow/react'

export const setElements = <T extends { id: string }>(
	prev: Array<T>,
	curr: Array<T>,
	set: GeneralHelpers['setNodes'] | GeneralHelpers['setEdges']
) => {
	const prev_map = prev.reduce(
		(total, item) => {
			total[item.id] = { ele: item, scaned: false }

			return total
		},
		{} as Record<string, { ele: T; scaned: boolean }>
	)

	const updates = [] as Array<T>
	const adds = [] as Array<T>

	curr.map(item => {
		if (prev_map[item.id]) {
			prev_map[item.id].scaned = true

			if (deepEqual(prev_map[item.id].ele, item)) return

			updates.push(item)
		} else {
			adds.push(item)
		}
	})

	const removes = Object.keys(prev_map)
		.filter(key => !prev_map[key].scaned)
		.map(id => prev_map[id].ele)

	set((prev_elements: Array<any>) => {
		let target = prev_elements.map(ele => {
			const update_ele = updates.find(i => i.id === ele.id)

			if (update_ele) return $copy(update_ele)

			return ele
		})

		if (adds.length) {
			target = target.concat(adds)
		}

		if (removes.length) {
			target = target.filter(item => !removes.find(i => i.id === item.id))
		}

		return target
	})
}
