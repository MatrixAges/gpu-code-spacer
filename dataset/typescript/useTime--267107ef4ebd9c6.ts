import dayjs from 'dayjs'
import { useMemo } from 'react'

import { getCrossTime } from '../../../utils'

import type { IPropsTimeBlock } from '@/modules/schedule/types'

interface Args extends Pick<IPropsTimeBlock, 'item'> {
	timeline: boolean
}

export default (args: Args) => {
	const { item, timeline } = args

	return useMemo(() => {
		const start_time = dayjs(item.raw_start_time ?? item.start_time)
		const end_time = dayjs(item.raw_end_time ?? item.end_time)

		const cross_time = getCrossTime(start_time, end_time, timeline)

		if (timeline) {
			return {
				time: `${start_time.format('MM.DD')} - ${end_time.format('MM.DD')}`,
				cross_time
			}
		} else {
			return {
				time: `${start_time.format('HH:mm')} - ${end_time.format('HH:mm')}`,
				cross_time
			}
		}
	}, [item, timeline])
}
