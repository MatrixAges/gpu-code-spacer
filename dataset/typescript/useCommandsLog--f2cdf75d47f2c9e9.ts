import { useEffect, useMemo, useState } from 'react'

import { registerLexicalCommandLogger } from '@lexical/utils'

import type { LexicalEditor } from 'lexical'
import type { LexicalCommandLog } from '@lexical/utils'

export default (editor: LexicalEditor) => {
	const [loggedCommands, setLoggedCommands] = useState<LexicalCommandLog>([])

	useEffect(() => {
		return registerLexicalCommandLogger(editor, setLoggedCommands)
	}, [editor])

	return useMemo(() => loggedCommands, [loggedCommands])
}
