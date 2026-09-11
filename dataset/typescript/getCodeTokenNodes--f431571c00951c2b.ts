import { highlighter } from '@/utils'

import { getHighlightNodes } from './index'

import type { BundledLanguage } from 'shiki'

export default (code_string: string, lang: BundledLanguage) => {
	const { tokens } = highlighter.codeToTokens(code_string, {
		lang,
		themes: { light: 'github-light', dark: 'github-dark-dimmed' }
	})

	return getHighlightNodes(tokens)
}
