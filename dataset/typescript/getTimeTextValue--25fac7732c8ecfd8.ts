export default (v: string) => {
	const hours = v.match(/(\d+)h/)?.[1]
	const minutes = v.match(/(\d+)m/)?.[1]

	const total_hours = hours ? parseInt(hours, 10) : 0
	const total_minutes = minutes ? parseInt(minutes, 10) : 0
	const total = total_hours * 60 + total_minutes

	return total
}
