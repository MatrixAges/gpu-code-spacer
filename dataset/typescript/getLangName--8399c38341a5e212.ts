export default (v: string) => {
	switch (v) {
		case 'coffeescript':
			return 'coffee'
		case 'c++':
			return 'cpp'
		case 'gql':
			return 'graphql'
		case 'hbs':
			return 'handlebars'
		case 'js':
			return 'javascript'
		case 'jl':
			return 'julia'
		case 'md':
			return 'markdown'
		case 'jade':
			return 'pug'
		case 'py':
			return 'python'
		case 'rb':
			return 'ruby'
		case 'bash':
			return 'shellscript'
		case 'sh':
			return 'shellscript'
		case 'shell':
			return 'shellscript'
		case 'zsh':
			return 'shellscript'
		case 'styl':
			return 'stylus'
		case 'ts':
			return 'typescript'
		case 'yml':
			return 'yaml'
	}

	return v
}
