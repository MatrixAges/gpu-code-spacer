export default {
	common: {
		status: {
			label: '状态',
			unchecked: '未完成',
			checked: '已完成',
			closed: '已关闭'
		},
		priority: '优先级',
		text: '文本',
		children: '子任务',
		options: '操作',
		archived: '已归档',
		close: '关闭',
		unclose: '取消关闭',
		done_time: '完成时间',
		duration: '耗时'
	},
	context_menu: {
		detail: '查看详情',
		insert: '添加',
		add_tags: '添加标签',
		change_level: '优先级',
		insert_children: '添加子任务',
		move: '移动到',
		remove: '删除',
		move_into: '移为子任务',
		move_out: '移为一级'
	},
	default_angles: ['此刻', '计划', '想法', '等待', '循环', '垃圾箱'],
	Header: {
		zen: '禅模式',
		table_mode: {
			export_xls: '导出为 Excel',
			filter: '过滤器'
		},
		mode: {
			list: '列表',
			kanban: '看板',
			table: '表格',
			mindmap: '脑图',
			flat: '平铺',
			quad: '四象限'
		},
		options: {
			archive: '归档',
			sort: {
				text: '排序',
				importance: '优先级',
				alphabetical: '字母顺序',
				create_at: '创建时间'
			},
			tags: '标签',
			analysis: '分析'
		}
	},
	SettingsModal: {
		desc: {
			label: '简介',
			placeholder: '关于todo的简单描述'
		},
		auto_archiving: {
			label: '自动归档',
			options: {
				'0m': '立刻',
				'3m': '3分钟',
				'3h': '3小时',
				'1d': '1天',
				'3d': '3天',
				'7d': '一周'
			}
		},
		quad_angles: '四象限'
	},
	Input: {
		placeholder: '添加待办',
		tag_placeholder: '标签',
		type: {
			todo: '待办',
			group: '组'
		},
		Remind: {
			title: '提醒',
			options: {
				two_hour: '二小时后',
				half_day: '半天后',
				day: '明天',
				after_tomorrow: '后天',
				three_day: '三天后',
				week: '一周后',
				half_month: '半个月后',
				month: '一个月后',
				half_year: '半年后',
				year: '一年后'
			}
		},
		Cycle: {
			type: {
				interval: '周期',
				specific: '定期'
			},
			title: '重复',
			cycle: '周期',
			disabled: '未开启',
			every: '每',
			exclude: '排除',
			options: {
				minute: '分钟',
				hour: '小时',
				day: '天',
				week: '周',
				month: '月',
				quarter: '季度',
				year: '年',
				special: '特殊日期',
				reset: '重置'
			},
			specific: {
				clock: '每天{{value}}点',
				weekday: '{{value}}',
				date: '每月{{value}}号',
				special: '每年{{month}}月{{date}}号',
				options: {
					clock: '每天几点',
					weekday: '每周几',
					date: '每月几号',
					special: '每年几月几号'
				}
			}
		},
		Deadline: {
			title: '截止时间'
		}
	},
	Archive: {
		title: '归档',
		end: '到底了',
		restore: '恢复',
		remove: '删除',
		clean: {
			title: '清档：',
			placeholder: '选择日期'
		},
		confirm: '你将删除{{date}}前的所有归档（{{counts}}条），请确认是否删除？',
		filter: {
			select: '选择',
			angle: '分类',
			tags: '标签',
			date: '日期',
			begin: '起始',
			end: '截止',
			status: '状态'
		}
	},
	Detail: {
		title: '任务详情',
		remark: {
			title: '备注',
			placeholder: '添加备注'
		},
		add_to_shcedule: '添加到日程'
	},
	Analysis: {
		title: '分析',
		durations: [
			{ label: '每日', value: 'daily' },
			{ label: '每周', value: 'weekly' },
			{ label: '每月', value: 'monthly' },
			{ label: '每季度', value: 'quarterly' },
			{ label: '每年', value: 'yearly' }
		],
		create: '创建',
		done: '完成',
		uncheck: '未完成',
		close: '关闭',
		group_by: '分组方式',
		sort_by: '排序方式',
		options_sort: {
			importance: '优先级',
			create_at: '创建时间',
			done_time: '完成时间'
		}
	}
}
