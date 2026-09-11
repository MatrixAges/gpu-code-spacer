export default (args: Array<boolean>) => {
	if (args.some(item => item === undefined)) return false

	return !args.some(item => item === true)
}
