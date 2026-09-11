export default (lang: string) => {
	if (lang.indexOf('en') !== -1) return 'en'
	if (lang.indexOf('zh') !== -1) return 'zh'

	return 'en'
}
