import { useStackSelector } from '@/context/stack'

export default () => {
	const id = useStackSelector(v => v?.id)

	return id
}
