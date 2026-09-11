export default (...args: Array<[number, number]>) => {
	const result: number[] = []

	for (const coord of args) {
		result.push(...coord)
	}

	return result
}
