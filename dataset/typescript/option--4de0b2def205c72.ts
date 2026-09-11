import { MenuOption } from '@lexical/react/LexicalTypeaheadMenuPlugin'

export default class Index extends MenuOption {
	title: string
	icon: JSX.Element
	shortcut: string
	keyboard?: string
	onSelect: (query_string: string) => void

	constructor(
		title: string,
		options: {
			icon?: Index['icon']
			shortcut?: Index['shortcut']
			keyboard?: Index['keyboard']
			onSelect: Index['onSelect']
		}
	) {
		super(title)

		const { icon, shortcut, keyboard, onSelect } = options

		this.title = title
		this.icon = icon!
		this.shortcut = shortcut!
		this.keyboard = keyboard
		this.onSelect = onSelect.bind(this)
	}
}
