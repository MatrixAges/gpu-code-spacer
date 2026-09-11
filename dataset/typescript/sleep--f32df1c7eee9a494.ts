export default (time: number) => {
	return new Promise(resolve => {
		setTimeout(() => resolve(true), time)
	})
}
