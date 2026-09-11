import { bundledLanguagesInfo, createHighlighter } from 'shiki'

export default await createHighlighter({
	langs: bundledLanguagesInfo.map(item => item.id),
	themes: ['github-light', 'github-dark-dimmed']
})
