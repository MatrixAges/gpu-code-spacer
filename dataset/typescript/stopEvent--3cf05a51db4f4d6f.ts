export default (e: Event) => {
	e.preventDefault()
	e.stopImmediatePropagation()
	e.stopPropagation()
}
