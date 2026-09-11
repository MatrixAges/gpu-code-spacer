import type { Options } from 'prettier'

const common_options = {
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 120,
	useTabs: false,
	semi: false,
	tabWidth: 4,
	jsxSingleQuote: true,
	bracketSpacing: true
} as Options

export default {
	javascript: {
		...common_options,
		parser: 'babel',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/babel')]
	},
	typescript: {
		...common_options,
		parser: 'typescript',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/typescript')]
	},
	tsx: {
		...common_options,
		parser: 'typescript',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/typescript')]
	},
	css: {
		...common_options,
		parser: 'css',
		getPlugins: () => [import('prettier/plugins/postcss')]
	},
	less: {
		...common_options,
		parser: 'less',
		getPlugins: () => [import('prettier/plugins/postcss')]
	},
	scss: {
		...common_options,
		parser: 'scss',
		getPlugins: () => [import('prettier/plugins/postcss')]
	},
	postcss: {
		...common_options,
		parser: 'less',
		getPlugins: () => [import('prettier/plugins/postcss')]
	},
	json: {
		...common_options,
		parser: 'json',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/babel')]
	},
	json5: {
		...common_options,
		parser: 'json5',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/babel')]
	},
	jsonc: {
		...common_options,
		parser: 'json5',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/babel')]
	},
	graphql: {
		...common_options,
		parser: 'graphql',
		getPlugins: () => [import('prettier/plugins/graphql')]
	},
	markdown: {
		...common_options,
		parser: 'markdown',
		getPlugins: () => [import('prettier/plugins/markdown')]
	},
	mdx: {
		...common_options,
		parser: 'mdx',
		getPlugins: () => [import('prettier/plugins/markdown')]
	},
	html: {
		...common_options,
		parser: 'html',
		getPlugins: () => [import('prettier/plugins/html')]
	},
	['vue-html']: {
		...common_options,
		parser: 'html',
		getPlugins: () => [import('prettier/plugins/html')]
	},
	['angular-ts']: {
		...common_options,
		parser: 'typescript',
		getPlugins: () => [import('prettier/plugins/estree'), import('prettier/plugins/typescript')]
	},
	['angular-html']: {
		...common_options,
		parser: 'html',
		getPlugins: () => [import('prettier/plugins/html')]
	},
	yaml: {
		...common_options,
		parser: 'yaml',
		getPlugins: () => [import('prettier/plugins/yaml')]
	}
} as Record<string, Options & { getPlugins: () => any }>
