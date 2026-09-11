import type { Schedule } from '@/types'
import type { File } from '@/models'

export type ChangedSettingValues = Partial<Schedule.Setting & File['data']> & {
	icon_info: { icon: string; icon_hue?: number }
}

export type SettingValues = Schedule.ScheduleSetting & File['data']
