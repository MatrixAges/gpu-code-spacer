import dayjs from 'dayjs'

export const fillTimeText = (v: number) => (v < 10 ? `0${v}` : v)

export const getTime = (v: number, raw?: boolean) => {
	const target = dayjs.duration(v, 'minute')

	if (raw) return { hours: target.hours(), minutes: target.minutes() }

	return {
		hours: fillTimeText(target.hours()),
		minutes: fillTimeText(target.minutes())
	}
}

export const getTimeText = (v: number) => {
	const { hours, minutes } = getTime(v)

	return `${hours}:${minutes}`
}

export const getGoingTime = (v: number) => {
	return parseInt(dayjs.duration(v, 'second').asMinutes().toFixed(2))
}

export const getGoingSecond = (v: number) => {
	return dayjs.duration(v, 'second').seconds()
}

export const getDurationTime = (v: number) => {
	const target = dayjs.duration(v, 'second')

	return {
		hours: fillTimeText(target.hours()),
		minutes: fillTimeText(target.minutes()),
		seconds: fillTimeText(target.seconds())
	}
}

export const getRotateLinePoints = (x: number, y: number, length: number, deg: number) => {
	const radius = (deg * Math.PI) / 180
	const target_x = x + length * Math.sin(radius)
	const target_y = y - length * Math.cos(radius)

	return [x, y, target_x, target_y]
}
