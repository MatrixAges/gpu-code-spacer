export default {
	common: {
		status: {
			label: 'Status',
			unchecked: 'Unchecked',
			checked: 'Checked',
			closed: 'Closed'
		},
		priority: 'Priority',
		text: 'Text',
		children: 'Children',
		options: 'Options',
		archived: 'Archived',
		close: 'Close',
		unclose: 'Unclose',
		done_time: 'Done Time',
		duration: 'Duration'
	},
	context_menu: {
		detail: 'Detail',
		insert: 'Insert',
		add_tags: 'Add Tags',
		change_level: 'Priority',
		insert_children: 'Add Child',
		move: 'Move To',
		remove: 'Remove',
		move_into: 'Into Child',
		move_out: 'Out'
	},
	default_angles: ['Now', 'Plan', 'Idea', 'Wait', 'Circle', 'Trashbox'],
	Header: {
		zen: 'Zen Mode',
		table_mode: {
			export_xls: 'Export to excel',
			filter: 'Filter'
		},
		mode: {
			list: 'List',
			kanban: 'Kanban',
			table: 'Table',
			mindmap: 'Mindmap',
			flat: 'Flat',
			quad: 'Quad'
		},
		options: {
			archive: 'Archive',
			sort: {
				text: 'Sort',
				importance: 'Priority',
				alphabetical: 'Alphabetical',
				create_at: 'Create Time'
			},
			tags: 'Tags',
			analysis: 'Analysis'
		}
	},
	SettingsModal: {
		desc: {
			label: 'Description',
			placeholder: 'A brief description about the todo.'
		},
		auto_archiving: {
			label: 'Auto archiving',
			options: {
				'0m': 'right now',
				'3m': '3 minutes',
				'3h': '3 hours',
				'1d': '1 day',
				'3d': '3 day',
				'7d': '1 week'
			}
		},
		quad_angles: 'Four quadrants'
	},
	Input: {
		placeholder: 'Add Todo',
		tag_placeholder: 'Tags',
		type: {
			todo: 'Todo',
			group: 'Group'
		},
		Remind: {
			title: 'Remind',
			options: {
				two_hour: 'after two hours',
				half_day: 'after half day',
				day: 'tomorrow',
				after_tomorrow: 'day after tomorrow',
				three_day: 'after three days',
				week: 'after a week',
				half_month: 'after half month',
				month: 'after a month',
				half_year: 'after six months',
				year: 'after a year'
			}
		},
		Deadline: {
			title: 'Deadline'
		},
		Cycle: {
			type: {
				interval: 'cycle',
				specific: 'regular'
			},
			title: 'Repeat',
			cycle: 'Cycle',
			disabled: 'Disabled',
			every: 'every',
			exclude: 'exclude',
			options: {
				minute: 'minite',
				hour: 'hour',
				day: 'day',
				week: 'week',
				month: 'month',
				quarter: 'quarter',
				year: 'year',
				special: 'special',
				reset: 'reset'
			},
			specific: {
				clock: `{{value}} o'clock of each day`,
				weekday: '{{value}}',
				date: '{{value}}th of each month',
				special: '{{month}}-{{date}} each year',
				options: {
					clock: 'x of each day',
					weekday: 'x of each week',
					date: 'x of each month',
					special: 'x-x each year'
				}
			}
		}
	},
	Archive: {
		title: 'Archive',
		end: 'Reached the end',
		restore: 'Restore',
		remove: 'Remove',
		clean: {
			title: 'Clean:',
			placeholder: 'Select date'
		},
		confirm: 'Do you want to delete {{counts}} archive items before {{date}}? Please confirm.',
		filter: {
			select: 'Select\t',
			angle: 'angle',
			tags: 'tags',
			date: '\tDate',
			begin: 'Begin',
			end: 'End',
			status: 'Status'
		}
	},
	Detail: {
		title: 'Detail',
		remark: {
			title: 'Remark',
			placeholder: 'Add Remark'
		},
		add_to_shcedule: 'Add To Schedule'
	},
	Analysis: {
		title: 'Analysis',
		durations: [
			{ label: 'daily', value: 'daily' },
			{ label: 'weekly', value: 'weekly' },
			{ label: 'monthly', value: 'monthly' },
			{ label: 'quarterly', value: 'quarterly' },
			{ label: 'yearly', value: 'yearly' }
		],
		create: 'Create',
		done: 'Done',
		uncheck: 'Uncheck',
		close: 'Close',
		group_by: 'Group By',
		sort_by: 'Sort By',
		options_sort: {
			importance: 'Priority',
			create_at: 'Create Time',
			done_time: 'Done Time'
		}
	}
}
