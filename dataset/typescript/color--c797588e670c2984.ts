import Color from 'color'

import type { Theme } from '@/appdata'

export const getTextColor = (v: string) => (Color(v).isDark() ? 'white' : 'black')

export const getTagColor = (color: string, theme: Theme) => {
	if (theme === 'dark') {
		return {
			bg_color: Color(color).alpha(0.36).lighten(0.6).saturationl(60).saturationv(72).toString(),
			text_color: 'rgba(var(--color_contrast_rgb), 0.72)'
		}
	}

	return {
		bg_color: Color(color).alpha(0.48).lighten(0.9).saturationl(60).saturationv(60).toString(),
		text_color: 'rgba(var(--color_contrast_rgb), 0.72)'
	}
}
