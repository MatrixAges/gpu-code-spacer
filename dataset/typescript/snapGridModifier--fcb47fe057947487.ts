import type { Modifier } from '@dnd-kit/core'

export default (x_grid_size: number, y_grid_size: number): Modifier => {
	return ({ transform }) => {
		const target = { ...transform }

		if (x_grid_size) target['x'] = Math.ceil(transform.x / x_grid_size) * x_grid_size
		if (y_grid_size) target['y'] = Math.ceil(transform.y / y_grid_size) * y_grid_size

		return target
	}
}
