import { useDebounce } from 'ahooks'
import { useMemo } from 'react'

import { getTagColor } from '@/utils'

import type { Theme } from '@/appdata'

export default (v: string, theme: Theme) => {
	const color = useDebounce(v, { wait: 450 })

	return useMemo(() => getTagColor(color, theme), [color, theme])
}
