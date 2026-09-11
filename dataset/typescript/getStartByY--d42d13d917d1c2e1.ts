export default (container: HTMLDivElement, y: number) => {
	if (!container) return

	const container_top = container.getBoundingClientRect().top
	const scroll_top = container.scrollTop

	const position = y - container_top + scroll_top
	const start = Math.floor(position / 16)

	return start
}
