import { is_prod } from '@/utils'
import { Record } from '@phosphor-icons/react'

import feather_icons_data from './feather_icons_data'
import ionicons_data from './ionicons_data'
import phosphor_icons_data from './phosphor_icons_data'

export type Icon = {
	id: string
	name: string
	keywords: Array<string>
	skins: Array<{ src: string }>
}

export const feather_icons = Object.keys(feather_icons_data).reduce(
	(total, key) => {
		const target = {
			id: key,
			name: key,
			// @ts-ignore
			keywords: feather_icons_data[key],
			skins: [{ src: is_prod ? require(`@/public/feather_icons/${key}.svg`) : `/feather_icons/${key}.svg` }]
		}

		total.icon_array.push(target)
		total.icon_object[key] = target

		return total
	},
	{
		icon_array: [] as Array<Icon>,
		icon_object: {} as Record<string, Icon>
	}
)

export const ionicons = ionicons_data.reduce(
	(total, item) => {
		const target = {
			id: item.name,
			name: item.name,
			keywords: item.tags,
			skins: [
				{ src: is_prod ? require(`@/public/ionicons/${item.name}.svg`) : `/ionicons/${item.name}.svg` }
			]
		}

		total.icon_array.push(target)
		total.icon_object[item.name] = target

		return total
	},
	{
		icon_array: [] as Array<Icon>,
		icon_object: {} as Record<string, Icon>
	}
)

export const phosphor_icons = phosphor_icons_data.reduce(
	(total, item) => {
		const styles = ['thin', 'light', '', 'bold', 'fill', 'duotone']

		const targets = styles.map(style => {
			const key = `${item.name}${style ? '-' + style : ''}`
			const target = {
				id: key,
				name: key,
				keywords: item.tags,
				skins: [
					{
						src: is_prod
							? require(`@/public/phosphor_icons/${key}.svg`)
							: `/phosphor_icons/${key}.svg`
					}
				]
			}

			total.icon_object[key] = target

			return target
		})

		total.icon_array.push(...targets)

		return total
	},
	{
		icon_array: [] as Array<Icon>,
		icon_object: {} as Record<string, Icon>
	}
)

export default {
	icon_array: feather_icons.icon_array.concat(ionicons.icon_array).concat(phosphor_icons.icon_array),
	icon_object: { ...feather_icons.icon_object, ...ionicons.icon_object, ...phosphor_icons.icon_object }
}
