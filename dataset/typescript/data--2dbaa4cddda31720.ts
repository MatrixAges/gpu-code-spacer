import { getGroup, getTodo } from '@/modules/todo/initials'

import type { Todo } from '@/types'

export const todos_cn = () =>
	[
		[
			getGroup({ sort: 1, text: '制定健身计划' }),
			getTodo({ sort: 2, text: '设定健身目标' }),
			getTodo({ sort: 3, text: '选择适合的锻炼方式' }),
			getTodo({ sort: 4, text: '制定每周锻炼计划' }),
			getTodo({ sort: 5, text: '确定休息日' }),
			getTodo({ sort: 6, text: '购置必要的健身设备' }),
			getTodo({ sort: 7, text: '找到合适的健身伙伴' })
		],
		[
			getGroup({ sort: 8, text: '设计均衡饮食' }),
			getTodo({ sort: 9, text: '计算每日热量需求' }),
			getTodo({ sort: 10, text: '规划每日饮食' }),
			getTodo({ sort: 11, text: '包含蛋白质来源' }),
			getTodo({ sort: 12, text: '添加水果和蔬菜' }),
			getTodo({ sort: 13, text: '控制食物份量' }),
			getTodo({ sort: 14, text: '保持充足的水分摄入' })
		],
		[
			getGroup({ sort: 15, text: '每日跟踪热量摄入' }),
			getTodo({ sort: 16, text: '使用食物日记应用' }),
			getTodo({ sort: 17, text: '记录每餐食物摄入' }),
			getTodo({ sort: 18, text: '注意零食摄入' }),
			getTodo({ sort: 19, text: '计算每日总摄入' }),
			getTodo({ sort: 20, text: '根据需要进行调整' }),
			getTodo({ sort: 21, text: '寻求营养指导' })
		],
		[
			getGroup({ sort: 22, text: '进行有氧运动' }),
			getTodo({ sort: 23, text: '选择有氧运动项目' }),
			getTodo({ sort: 24, text: '确定运动时间和强度' }),
			getTodo({ sort: 25, text: '缓慢开始逐渐增加' }),
			getTodo({ sort: 26, text: '保持锻炼的多样性' }),
			getTodo({ sort: 27, text: '监测心率' }),
			getTodo({ sort: 28, text: '保持锻炼的连贯性' })
		],
		[
			getGroup({ sort: 29, text: '引入力量训练' }),
			getTodo({ sort: 30, text: '制定举重计划' }),
			getTodo({ sort: 31, text: '针对不同肌群进行训练' }),
			getTodo({ sort: 32, text: '包括体重运动' }),
			getTodo({ sort: 33, text: '逐渐增加阻力' }),
			getTodo({ sort: 34, text: '注重正确的动作' }),
			getTodo({ sort: 35, text: '留有充分恢复时间' })
		],
		[
			getGroup({ sort: 36, text: '注重充足睡眠' }),
			getTodo({ sort: 37, text: '设定规律的睡眠时间' }),
			getTodo({ sort: 38, text: '建立放松的入睡习惯' }),
			getTodo({ sort: 39, text: '避免临睡前摄入咖啡因' }),
			getTodo({ sort: 40, text: '优化睡眠环境' }),
			getTodo({ sort: 41, text: '睡眠目标7-9小时' }),
			getTodo({ sort: 42, text: '管理压力水平' })
		]
	] as Array<Array<Todo.TodoItem>>

export const todos_en = () =>
	[
		[
			getGroup({ sort: 1, text: 'Develop a Customized Workout Routine' }),
			getTodo({ sort: 2, text: 'Set Clear Fitness Goals' }),
			getTodo({ sort: 3, text: 'Choose Diverse Exercise Types' }),
			getTodo({ sort: 4, text: 'Create a Weekly Exercise Schedule' }),
			getTodo({ sort: 5, text: 'Incorporate Rest Days' }),
			getTodo({ sort: 6, text: 'Acquire Necessary Fitness Equipment' }),
			getTodo({ sort: 7, text: 'Find a Workout Partner for Motivation' })
		],

		[
			getGroup({ sort: 8, text: 'Design a Balanced Nutrition Plan' }),
			getTodo({ sort: 9, text: 'Calculate Daily Caloric Needs' }),
			getTodo({ sort: 10, text: 'Plan Nutrient-Rich Meals' }),
			getTodo({ sort: 11, text: 'Include Protein from Various Sources' }),
			getTodo({ sort: 12, text: 'Integrate Fruits and Vegetables' }),
			getTodo({ sort: 13, text: 'Monitor Portion Control' }),
			getTodo({ sort: 14, text: 'Prioritize Adequate Hydration' })
		],

		[
			getGroup({ sort: 15, text: 'Track Daily Caloric Intake' }),
			getTodo({ sort: 16, text: 'Utilize a Food Diary App' }),
			getTodo({ sort: 17, text: 'Log Every Meal and Snack' }),
			getTodo({ sort: 18, text: 'Monitor Snack Intake' }),
			getTodo({ sort: 19, text: 'Calculate Daily Caloric Totals' }),
			getTodo({ sort: 20, text: 'Adjust Nutrition as Needed' }),
			getTodo({ sort: 21, text: 'Seek Guidance from a Nutritionist' })
		],

		[
			getGroup({ sort: 22, text: 'Incorporate Cardiovascular Exercise' }),
			getTodo({ sort: 23, text: 'Select Cardio Activities' }),
			getTodo({ sort: 24, text: 'Determine Duration and Intensity' }),
			getTodo({ sort: 25, text: 'Begin Slowly, Gradually Increase' }),
			getTodo({ sort: 26, text: 'Include Varied Workouts' }),
			getTodo({ sort: 27, text: 'Monitor Heart Rate' }),
			getTodo({ sort: 28, text: 'Maintain Consistency' })
		],

		[
			getGroup({ sort: 29, text: 'Integrate Strength Training' }),
			getTodo({ sort: 30, text: 'Develop a Weightlifting Plan' }),
			getTodo({ sort: 31, text: 'Target Different Muscle Groups' }),
			getTodo({ sort: 32, text: 'Include Bodyweight Exercises' }),
			getTodo({ sort: 33, text: 'Gradually Increase Resistance' }),
			getTodo({ sort: 34, text: 'Focus on Proper Form' }),
			getTodo({ sort: 35, text: 'Allow for Ample Recovery' })
		],
		[
			getGroup({ sort: 36, text: 'Prioritize Quality Sleep' }),
			getTodo({ sort: 37, text: 'Establish a Regular Sleep Schedule' }),
			getTodo({ sort: 38, text: 'Create a Relaxing Bedtime Routine' }),
			getTodo({ sort: 39, text: 'Limit Caffeine Before Bed' }),
			getTodo({ sort: 40, text: 'Optimize Sleep Environment' }),
			getTodo({ sort: 41, text: 'Aim for 7-9 Hours of Sleep' }),
			getTodo({ sort: 42, text: 'Manage Stress Levels' })
		]
	] as Array<Array<Todo.TodoItem>>
