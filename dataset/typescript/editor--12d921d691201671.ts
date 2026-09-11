export default {
	placeholder: `写点什么，按'/'选择块`,
	insert: '插入',
	over_limit: '字数超出限制',
	name: {
		Image: '图片',
		Emoji: '表情',
		Code: '代码',
		UnorderedList: '无序列表',
		OrderedList: '有序列表',
		TodoList: '任务列表',
		Table: '表格',
		Katex: '公式',
		Mermaid: '绘图',
		Divider: '分割线',
		Quote: '引言',
		Toggle: '折叠',
		Navigation: '目录',
		Ref: '引用'
	},
	Image: {
		modal: {
			label: {
				url: '链接',
				file: '文件',
				alt: '说明',
				inline: '行内'
			},
			placeholder: {
				url: '图片链接',
				alt: '图片说明'
			}
		}
	},
	Katex: {
		modal: {
			label: {
				equation: '公式',
				inline: '行内'
			},
			placeholder: {
				equation: '公式表达式'
			}
		}
	},
	Mermaid: {
		modal: {
			label: {
				definition: '定义'
			},
			placeholder: '图定义'
		}
	},
	Navigation: {
		empty: '未检测到标题'
	},
	Table: {
		actions: {
			header_row: '标题行',
			insert_above: '上方插入',
			insert_below: '下方插入',
			align: {
				title: '对齐',
				left: '靠左',
				center: '居中',
				right: '靠右'
			},
			header_col: '标题列',
			insert_left: '左侧插入',
			insert_right: '右侧插入',
			reset_width: '重置宽度'
		}
	},
	Ref: {
		latest_items: '最近的项',
		latest_files: '最近的文件'
	},
	Count: {
		total: '字数（不计空格）',
		filted: '字数（不计标点）'
	},
	Options: {
		import: {
			warning: '导入的内容将覆盖当前内容，确认导入'
		}
	}
}
