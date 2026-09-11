import type { Shortcuts } from '@/models'

export default [
	{
		key_bindings: { darwin: 'command+k', win32: 'ctrl+k' },
		event_path: 'global.app.showSearch',
		readonly: true,
		options: { keydown: true, keyup: false }
	},
	{
		key_bindings: '*',
		special_key: 'escape',
		event_path: 'global.app.closeSearch',
		readonly: true,
		options: { keydown: false, keyup: true }
	},
	{
		key_bindings: { darwin: 'command+l', win32: 'ctrl+l' },
		event_path: 'global.screenlock.lock',
		readonly: true,
		options: { keydown: true, keyup: false }
	}
] as Shortcuts['keys']
