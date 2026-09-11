import { bundledLanguagesInfo } from 'shiki'

import type { BundledLanguageInfo } from 'shiki'

export default bundledLanguagesInfo.reduce(
	(total, item) => {
		total[item.id] = item

		return total
	},
	{} as Record<string, BundledLanguageInfo>
)
