import type { Todos } from '../model'
import type { CSSProperties } from 'react'

export default (todos: Todos) => {
	let bg: string = ''

	const relative_date = typeof todos === 'string' ? todos : todos.relative_date
	const target = {} as CSSProperties

	if (relative_date) {
		switch (relative_date) {
			case 'now':
				bg = 'rgba(var(--color_text_rgb),0.24)'
				break
			case 'future':
				bg = 'var(--color_text_sub)'
				break
		}

		if (bg) target['backgroundColor'] = bg
	}

	return target
}
