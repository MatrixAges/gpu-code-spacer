export default (_target: any, methodName: string, descriptor: PropertyDescriptor) => {
	const func = descriptor.value

	descriptor.value = async function (...args: any[]) {
		// @ts-ignore
		this.utils.loading[methodName] = true

		const result = await func.apply(this, args)

		// @ts-ignore
		this.utils.loading[methodName] = false

		return result
	}

	return descriptor
}
