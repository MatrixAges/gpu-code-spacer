import { App } from '@/types'

export default ['todo', 'note', 'schedule'] as Array<App.ModuleType>

export const options_search_type = [
	{ label: $t('common.item'), value: 'item' },
	{ label: $t('common.file'), value: 'file' }
]
