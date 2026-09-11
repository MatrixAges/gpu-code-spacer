export default {
	nav: {
		titles: {
			Global: '全局设置',
			Account: '账号信息',
			Billing: '付费计划',
			Menu: '菜单设置',
			Shortcuts: '快捷键',
			About: '关于'
		}
	},
	Normal: {
		title: '设置',
		language: {
			title: '语言',
			desc: '应用所使用的语言'
		},
		theme: {
			title: '主题',
			desc: '应用主题色、组件颜色',
			options: {
				light: '浅色',
				dark: '深色'
			},
			auto_theme: '自动切换主题，6点到18点浅色主题，其余时间深色主题'
		},
		show_bar_title: {
			title: '展示导航栏标题',
			desc: '显示导航图标下方的标题'
		},
		full_page_width: {
			title: '完整页面宽度',
			desc: '内容页面的宽度规则'
		}
	},
	Tray: {
		title: '托盘区窗口',
		select_file: '选择文件',
		Todo: {
			title: '待办',
			desc: '在托盘查看待办',
			select_angle: '选择分类'
		},
		Schedule: {
			title: '日程',
			desc: '在托盘查看日程'
		}
	},
	NavItems: {
		title: '功能项'
	},
	ColorSelector: {
		title: '主题色'
	},
	Screenlock: {
		title: '锁屏',
		password: {
			title: '密码',
			desc: '设定应用锁屏密码'
		},
		autolock: {
			title: '自动锁屏',
			desc: '不活跃时锁定屏幕'
		},
		getFingerprint: {
			error: '指纹生成失败，请联系开发商'
		}
	},
	Billing: {
		upgrade: '升级计划',
		purchase: '购买',
		upgraded: '已升级',
		purchased: '已购买',
		unit: '年',
		payonce: '一次性付费',
		free: {
			title: '免费版',
			items: {
				'0': '免费使用所有功能模块',
				'1': '无需账号或注册',
				'2': '离线使用',
				'3': '支持导入导出备份',
				'4': '暗色模式',
				'5': '应用锁屏',
				'6': '多主题'
			}
		},
		pro: {
			title: '专业版',
			items: {
				'0': '所有免费版特性以及...',
				'1': '6台设备（macOS 或 Windows）',
				'2': '日常数据洞察',
				'3': '基于文件的同步'
			},
			todo: {
				'0': '分析面板，每日自动生成报表'
			},
			note: {
				'0': '自定义图床'
			},
			pomo: {
				'0': '正念冥想模式'
			},
			schedule: {
				'0': '时间线视图，固定视图'
			}
		},
		infinity: {
			title: '终身版'
		}
	},
	Note: {
		toc: {
			title: '大纲模式',
			desc: '大纲用于总览文章结构',
			options: ['默认', '常亮', '最小化', '隐藏']
		},
		use_content_heading: {
			title: '内容标题',
			desc: '使用内容标题作为笔记标题'
		},
		show_heading_text: {
			title: '展示标题级别',
			desc: '在标题的左侧展示标题的级别'
		},
		serif: {
			title: '衬线字体',
			desc: '衬线字体有易读、专业、可识别等优点'
		},
		small_text: {
			title: '小字号',
			desc: '更好的字号以展示更多内容'
		},
		count: {
			title: '字数统计',
			desc: '统计全文字数，不包含空格'
		},
		batch_import: {
			desc: '批量导入Markdown文件'
		}
	},
	Pomo: {
		sound: {
			title: '声音提示',
			desc: '完成后发出提示音'
		}
	},
	User: {
		free: {
			title: '免费用户',
			desc: '有使用限制'
		},
		pro: {
			title: '专业会员',
			desc: '无功能限制'
		},
		infinity: {
			title: '终生会员',
			desc: '全功能'
		},
		max: {
			title: '高级用户',
			desc: '畅享云服务'
		},
		sponsor: {
			title: '赞助者',
			desc: '用户席位'
		},
		gold_sponsor: {
			title: '金牌赞助商',
			desc: '一对一支持'
		},
		team: {
			title: '团队用户',
			desc: '支持团队协作'
		}
	},
	Tutotial: {
		learn_features: 'IF的全局特性',
		learn_todo: '如何使用待办',
		learn_note: '如何使用笔记',
		learn_pomo: '如何使用番茄钟',
		learn_schedule: '如何使用日程'
	},
	Backup: {
		title: '备份',
		export: {
			title: '导出',
			desc: '导出文件作为备份',
			loading: '导出中'
		},
		import: {
			title: '导入',
			desc: '导入之前导出的备份文件',
			loading: '导入中',
			error: '出现错误，请检查导入数据是否正确'
		}
	},
	Update: {
		title: '版本更新',
		subtitle: '更新',
		desc: '当前版本',
		btn_update: '检查更新',
		btn_download: '下载更新',
		no_update: '当前使用的IF是最新版本',
		has_update: '检测到新版本',
		downloading: '正在下载新版本',
		downloaded: '已下载更新内容，重启安装更新',
		btn_install: '安装更新',
		install_backup: '更新前请进行备份'
	}
}
