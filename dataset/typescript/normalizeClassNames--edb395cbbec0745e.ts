export default (...classNames: Array<typeof undefined | boolean | null | string>): Array<string> => {
	const rval = []
	for (const className of classNames) {
		if (className && typeof className === 'string') {
			for (const [s] of className.matchAll(/\S+/g)) {
				rval.push(s)
			}
		}
	}
	return rval
}
