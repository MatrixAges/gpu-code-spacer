import dayjs from 'dayjs'
import { useMemo } from 'react'

import { getTimeText } from '@/modules/schedule/utils'

import styles from '../index.css'

import type { IPropsTimeBlock } from '@/modules/schedule/types'

interface Args extends Pick<IPropsTimeBlock, 'item' | 'month_mode' | 'step'> {
	timeline: boolean
}

export default (args: Args) => {
	const { item, month_mode, step, timeline } = args

	return useMemo(() => {
		const { value } = getTimeText(dayjs(item.start_time), dayjs(item.end_time))

		if (timeline) {
			return {
				class: ['absolute', styles.timeline, item.past && styles.past],
				style: {
					left: `calc(${item.start * step!}px + 1px)`,
					width: `calc(${item.length * step!}px - 2px)`
				}
			}
		}

		if (month_mode) {
			return {
				class: ['relative', styles.month_mode],
				style: {}
			}
		}

		return {
			class: [
				'absolute',
				value <= 15 && styles.xxsmall,
				value <= 20 && value > 15 && styles.xsmall,
				value < 45 && value > 20 && styles.small,
				value >= 45 && value < 60 && styles.middle,
				value === 60 && styles.large,
				value >= 60 && styles.xlarge,
				item.past && styles.past
			],
			style: {
				top: `calc(${item.start * 16}px + 0.5px)`,
				left: 1,
				width: `calc(100% - 2px)`,
				height: `calc(${item.length * 16}px - 2px)`
			}
		}
	}, [item, month_mode, step, timeline])
}
