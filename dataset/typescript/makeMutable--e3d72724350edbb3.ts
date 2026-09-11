import type { Mutable } from '@/types'

export default <T>(obj: Readonly<T>): Mutable<T> => {
	return obj as Mutable<T>
}
