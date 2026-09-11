const locales = ['en', 'zh'] as const

export type Lang = (typeof locales)[number]

export const locale_options = [
	{
		label: 'English',
		value: 'en'
	},
	{
		label: '简体中文',
		value: 'zh'
	}
]

export default locales
