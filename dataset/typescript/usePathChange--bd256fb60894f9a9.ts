import { useEffect } from 'react'
import { contextMenu } from 'react-contexify'
import { useLocation } from 'react-router-dom'

export default () => {
	const { pathname } = useLocation()

	useEffect(() => {
		contextMenu.hideAll()
	}, [pathname])
}
