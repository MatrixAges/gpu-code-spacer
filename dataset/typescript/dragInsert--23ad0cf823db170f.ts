import { INSERT_IMAGE_COMMAND } from '@/Editor/commands'
import { isMimeType, mediaFileReader } from '@lexical/utils'

import { getFileAlt } from '../../../utils'
import { MAX_SIZE } from '../const'

import type { LexicalEditor } from 'lexical'

export default async (editor: LexicalEditor, files: Array<File>) => {
	const ACCEPTABLE_IMAGE_TYPES = ['image/']

	const res = await mediaFileReader(files, ACCEPTABLE_IMAGE_TYPES)

	for (const { file, result } of res) {
		if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
			if (file.size <= MAX_SIZE * 1024 * 1024) {
				editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
					src: result,
					alt: getFileAlt(file.name)
				})
			} else {
				$message.error(
					// @ts-ignore
					$t('components.FileUploader.over_size', {
						maxSize: MAX_SIZE
					})
				)
			}
		}
	}
}
