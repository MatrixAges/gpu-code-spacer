import { useMemo } from 'react'

import { getTime } from '../utils'

interface HookArgs {
	work_time: number
	break_time: number
}

export default (args: HookArgs) => {
	const { work_time, break_time } = args

	const target_work_time = useMemo(() => getTime(work_time), [work_time])

	const target_break_time = useMemo(() => getTime(break_time), [break_time])

	return { target_work_time, target_break_time }
}
