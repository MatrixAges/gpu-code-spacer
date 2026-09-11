import Color from 'color'
import { useMemo } from 'react'

import type { Schedule } from '@/types'

export default (tags: Schedule.Setting['tags'], tag: Schedule.Item['tag']) => {
	return useMemo(() => {
		if (!tags.length) return {}
		if (!tag) return {}

		const target = tags.find(it => it.id === tag)!

		return {
			'--tag_color': Color(target.color).rgb().array().join(',')
		}
	}, [tag, tags])
}
