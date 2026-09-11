export const themes = ['light', 'dark'] as const

export type Theme = (typeof themes)[number]

export const color_mains = [
	'#FF0000',
	'#E91E63',
	'#9C27B0',
	'#673AB7',
	'#3F51B5',
	'#2196F3',
	'#00BCD4',
	'#009688',
	'#4CAF50',
	'#AFB42B',
	'#FBC02D',
	'#FF9800',
	'#FF5722',
	'#795548',
	'#757575',
	'#607D8B'
]
