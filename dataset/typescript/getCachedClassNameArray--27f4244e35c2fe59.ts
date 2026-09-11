import { normalizeClassNames } from './index'

import type { EditorThemeClasses } from 'lexical'

export default (classNamesTheme: EditorThemeClasses, classNameThemeType: string): Array<string> => {
	if (classNamesTheme.__lexicalClassNameCache === undefined) {
		classNamesTheme.__lexicalClassNameCache = {}
	}

	const classNamesCache = classNamesTheme.__lexicalClassNameCache
	const cachedClassNames = classNamesCache[classNameThemeType]

	if (cachedClassNames !== undefined) {
		return cachedClassNames
	}

	const classNames = classNamesTheme[classNameThemeType]

	if (typeof classNames === 'string') {
		const classNamesArr = normalizeClassNames(classNames)

		classNamesCache[classNameThemeType] = classNamesArr

		return classNamesArr
	}

	return classNames
}
