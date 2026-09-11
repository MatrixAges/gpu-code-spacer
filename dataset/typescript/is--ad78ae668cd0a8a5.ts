export const is_browser_shell = process.env.SHELL === 'browser'
export const is_electron_shell = process.env.SHELL === 'electron'
export const is_dev = process.env.NODE_ENV === 'development'
export const is_prod = process.env.NODE_ENV === 'production'
export const is_sandbox = Boolean(process.env.SANDBOX)
export const is_mac_id = window.$shell?.id_platform === 'mac'
export const is_win_id = window.$shell?.id_platform === 'win'
export const is_electron = window.$shell?.type === 'electron'
export const is_mac_electron = window.$shell?.platform === 'darwin' && window.$shell?.type === 'electron'
export const is_win_electron = window.$shell?.platform === 'win32' && window.$shell?.type === 'electron'
export const is_mac_dev = is_mac_electron && is_dev
export const is_win_dev = is_win_electron && is_dev
