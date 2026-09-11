import type { BackendModule } from 'i18next'

export const resourcesToBackend = {
	type: 'backend',
	read(lang, _, callback) {
		import(`@/locales/${lang}/index`).then(data => {
			callback(null, data.default.translation)
		})
	}
} as BackendModule
