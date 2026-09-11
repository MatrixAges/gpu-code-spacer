export default {
	placeholder: `Write something, '/' for commands`,
	insert: 'Insert',
	over_limit: 'Over text limit',
	name: {
		Image: 'Image',
		Emoji: 'Emoji',
		Code: 'Code',
		UnorderedList: 'Bullet List',
		OrderedList: 'Order List',
		TodoList: 'Todo List',
		Table: 'Table',
		Katex: 'Katex',
		Mermaid: 'Mermaid',
		Divider: 'Divider',
		Quote: 'Quote',
		Toggle: 'Toggle',
		Navigation: 'Catalog',
		Ref: 'Ref'
	},
	Image: {
		modal: {
			label: {
				url: 'URL',
				file: 'File',
				alt: 'Alt',
				inline: 'Inline'
			},
			placeholder: {
				url: 'Image URL',
				alt: 'Image alt text'
			}
		}
	},
	Katex: {
		modal: {
			label: {
				equation: 'Equation',
				inline: 'Inline'
			},
			placeholder: {
				equation: 'Equation expression'
			}
		}
	},
	Mermaid: {
		modal: {
			label: {
				definition: 'Definition'
			},
			placeholder: 'Graph definition'
		}
	},
	Navigation: {
		empty: 'No Headings detected'
	},
	Table: {
		actions: {
			header_row: 'Header Row',
			insert_above: 'Insert Above',
			insert_below: 'Insert Below',
			align: {
				title: 'Align',
				left: 'Left',
				center: 'Center',
				right: 'Right'
			},
			header_col: 'Header Col',
			insert_left: 'Insert Left',
			insert_right: 'Insert Right',
			reset_width: 'Reset Width'
		}
	},
	Ref: {
		latest_items: 'Latest items',
		latest_files: 'Latest files'
	},
	Count: {
		total: '- Spaces',
		filted: '- Punctuations'
	},
	Options: {
		import: {
			warning: 'The imported content will overwrite the current content. Confirm import?'
		}
	}
}
