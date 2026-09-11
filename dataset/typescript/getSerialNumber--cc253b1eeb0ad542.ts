export default (str: string) => {
	let result = ''
	let index = 0

	while (result.length < 3 && index < str.length) {
		const char = str[index]

		if (/[a-zA-Z]/.test(char)) {
			result += char
		}

		index++
	}

	return result
}
