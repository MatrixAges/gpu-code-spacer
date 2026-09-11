import { useEffect, useState } from 'react'

export default (value: unknown) => {
	const [changing, setChanging] = useState(false)

	useEffect(() => {
		setChanging(true)

		const timer = setTimeout(() => setChanging(false), 450)

		return () => clearTimeout(timer)
	}, [value])

	return changing
}
