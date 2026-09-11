export default {
	nav: {
		titles: {
			Global: 'Global',
			Account: 'Account',
			Billing: 'Billing',
			Menu: 'Menu',
			Shortcuts: 'Shortcuts',
			About: 'About'
		}
	},
	Normal: {
		title: 'Setting',
		language: {
			title: 'Language',
			desc: 'Languages used by application'
		},
		theme: {
			title: 'Theme',
			desc: 'App theme color, component color',
			options: {
				light: 'Light',
				dark: 'Dark'
			},
			auto_theme: 'Auto theme, light theme from 6AM to 6PM, dark theme the rest of time'
		},
		show_bar_title: {
			title: 'Show Bar Title',
			desc: 'Display title below navigation icon'
		},
		full_page_width: {
			title: 'Full Page Width',
			desc: 'Width rules of content page'
		}
	},
	Tray: {
		title: 'Tray Window',
		select_file: 'Select File',
		Todo: {
			title: 'Todo',
			desc: 'Check todo in the tray',
			select_angle: 'Select Angle'
		},
		Schedule: {
			title: 'Schedule',
			desc: 'Check schedule in the tray'
		}
	},
	NavItems: {
		title: 'Feature'
	},
	ColorSelector: {
		title: 'Theme Color'
	},
	Screenlock: {
		title: 'Screen Lock',
		password: {
			title: 'Password',
			desc: 'Set app screen lock password'
		},
		autolock: {
			title: 'Autolock',
			desc: 'Lock the screen when inactive'
		},
		getFingerprint: {
			error: 'Fingerprint generation failed, please contact the developer.'
		}
	},
	Billing: {
		upgrade: 'Upgrade',
		purchase: 'Purchase',
		upgraded: 'Upgraded',
		purchased: 'Purchased',
		unit: 'Year',
		payonce: 'Payonce',
		free: {
			title: 'Free',
			items: {
				'0': 'Free access to all modules',
				'1': 'No account or registration required',
				'2': 'Offline use',
				'3': 'Support import, export and backup',
				'4': 'Dark mode',
				'5': 'App lock screen',
				'6': 'Multiple themes'
			}
		},
		pro: {
			title: 'Pro',
			items: {
				'0': 'All free version features plus...',
				'1': '6 devices (macOS or Windows)',
				'2': 'Daily data insights',
				'3': 'File-based synchronization'
			},
			todo: {
				'0': 'Analysis panel, automatic daily report generation'
			},
			note: {
				'0': 'Customized image hosting'
			},
			pomo: {
				'0': 'Mindfulness meditation mode'
			},
			schedule: {
				'0': 'Timeline view, fixed view'
			}
		},
		infinity: {
			title: 'Lifetime'
		}
	},
	Note: {
		toc: {
			title: 'Table of Contents',
			desc: 'Overview of article structure',
			options: ['default', 'visible', 'minimize', 'hidden']
		},
		use_content_heading: {
			title: 'Content Heading',
			desc: 'Use content heading as note title'
		},
		show_heading_text: {
			title: 'Show Heading Level',
			desc: 'Show heading level on the left side of the heading'
		},
		serif: {
			title: 'Serif',
			desc: 'Readability, professionalism, and recognizability'
		},
		small_text: {
			title: 'Small Text',
			desc: 'Optimal size for more content'
		},
		count: {
			title: 'Word Count',
			desc: 'Count the total number of words, excluding spaces'
		},
		batch_import: {
			desc: 'Batch import markdown files'
		}
	},
	Pomo: {
		sound: {
			title: 'Sound',
			desc: 'Remind when work and break completed'
		}
	},
	User: {
		free: {
			title: 'Free',
			desc: 'Restrictions'
		},
		pro: {
			title: 'Pro',
			desc: 'Unlimited'
		},
		infinity: {
			title: 'Lifetime',
			desc: 'Full Features'
		},
		max: {
			title: 'Max',
			desc: 'Cloud Services'
		},
		sponsor: {
			title: 'Sponsor',
			desc: 'User seats'
		},
		gold_sponsor: {
			title: 'Gold Sponsor',
			desc: '1 to 1 support'
		},
		team: {
			title: 'Team',
			desc: 'Collaboration'
		}
	},
	Tutotial: {
		learn_features: 'IF Features',
		learn_todo: 'How to use Todo',
		learn_note: 'How to use Note',
		learn_pomo: 'How to use Pomo',
		learn_schedule: 'How to use Schedule'
	},
	Backup: {
		title: 'Backup',
		export: {
			title: 'Export',
			desc: 'Export file as backup',
			loading: 'Exporting'
		},
		import: {
			title: 'Import',
			desc: 'Import previously exported backup file',
			loading: 'Importing',
			error: 'An error occurred, please check whether the imported data is correct'
		}
	},
	Update: {
		title: 'Version Update',
		subtitle: 'Update',
		desc: 'Current version',
		btn_update: 'Check update',
		btn_download: 'Download',
		no_update: 'The latest version of IF is currently in use',
		has_update: 'New version detected',
		downloading: 'Downloading new version',
		downloaded: 'Content has been downloaded, restart to install',
		btn_install: 'Install',
		install_backup: 'Please back up before updating'
	}
}
