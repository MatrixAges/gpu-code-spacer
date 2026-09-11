export default (_target: any, _methodName: string, descriptor: PropertyDescriptor) => {
	const func = descriptor.value

	descriptor.value = async function (...args: any[]) {
		let ignore_disable_watcher = false

		if ((this as any).disable_watcher) {
			ignore_disable_watcher = true
		} else {
			;(this as any).disable_watcher = true
		}

		const result = await func.apply(this, args)

		if (!ignore_disable_watcher) (this as any).disable_watcher = false

		return result
	}

	return descriptor
}
