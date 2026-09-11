import { useDeepMemo } from '@openages/stk/react'

import type { CSSProperties } from 'react'
import type { Column } from '../types'

interface Args {
	align: Column['align']
	fixed: Column['fixed']
	stickyOffset: Column['stickyOffset']
}

export default (args: Args) => {
	const { align, fixed, stickyOffset } = args

	return useDeepMemo(() => {
		const target = {} as CSSProperties

		if (align) target['textAlign'] = align

		if (fixed) {
			target['position'] = 'sticky'
			target['zIndex'] = 100

			if (fixed === 'left') target['left'] = stickyOffset
			if (fixed === 'right') target['right'] = stickyOffset
		}

		return target
	}, [align, fixed, stickyOffset])
}
