import app from './app'
import atoms from './atoms'
import common from './common'
import components from './components'
import dirtree from './dirtree'
import doc_parser from './doc_parser'
import editor from './editor'
import iap from './iap'
import layout from './layout'
import modules from './modules'
import pomo from './pomo'
import schedule from './schedule'
import setting from './setting'
import shortcuts from './shortcuts'
import todo from './todo'

export default {
	translation: {
		app,
		iap,
		common,
		setting,
		modules,
		atoms,
		layout,
		shortcuts,
		dirtree,
		components,
		editor,
		todo,
		pomo,
		schedule,
		doc_parser
	}
} as const
