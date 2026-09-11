if (process.env.RELEASE === '1') {
	import('console-ban').then(({ init }) => {
		init({ redirect: Math.random() > 0.5 ? '#/' : '#/pomo' })
	})
}
