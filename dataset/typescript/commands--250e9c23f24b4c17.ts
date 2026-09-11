import { createCommand } from 'lexical'

export const CHANGE_SELECTION_ELEMENTS = createCommand('CHANGE_SELECTION_ELEMENTS')
export const SHOW_MODAL_COMMAND = createCommand('SHOW_MODAL_COMMAND')
export const CHANGE_EDITOR_SETTINGS = createCommand<{ key: string; value: any }>('CHANGE_EDITOR_SETTINGS')

export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND')
export const INSERT_KATEX_COMMAND = createCommand('INSERT_KATEX_COMMAND')
export const INSERT_DIVIDER_COMMAND = createCommand('INSERT_DIVIDER_COMMAND')
export const INSERT_CODE_COMMAND = createCommand('INSERT_CODE_COMMAND')
export const INSERT_TOGGLE_COMMAND = createCommand('INSERT_TOGGLE_COMMAND')
export const INSERT_TABLE_COMMAND = createCommand('INSERT_TABLE_COMMAND')
export const INSERT_NAVIGATION_COMMAND = createCommand('INSERT_NAVIGATION_COMMAND')
export const INSERT_MERMAID_COMMAND = createCommand('INSERT_MERMAID_COMMAND')
export const INSERT_REF_COMMAND = createCommand('INSERT_REF_COMMAND')
