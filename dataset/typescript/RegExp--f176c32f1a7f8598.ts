export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/
export const MARKDOWN_EMPTY_LINE_REG_EXP = /^\s{0,3}$/
export const CODE_BLOCK_REG_EXP = /^[ \t]*```(?!mermaid)(\w{1,10})?\s?$/
export const MERMAID_BLOCK_REG_EXP = /^[ \t]*```mermaid?\s?$/
export const QUOTE_BLOCK_REG_EXP = /^>\s/
export const TOGGLE_START_BLOCK_REG_EXP = /<details[^>]*>/
export const TOGGLE_END_BLOCK_REG_EXP = /<\/details[^>]*>/
