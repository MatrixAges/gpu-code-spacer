export namespace Auth {
	export const enum UserTypes {
		free = 'free',

		/** $3 每月
		 *  所有离线基础功能
		 *  Backend Server
		 */
		pro = 'pro',

		/** $12 每月（AI + Sync + Share） */
		max = 'max',

		/** 付费用户未达到一定量之前不开放 $60 每月每人
		 *  Cloud Pages：云端页面，并提供 Console 对云端进行管理（用户、权限、资源开放性）
		 *  Local Server（独立服务器，启动之后自动生成一串服务器地址，可nginx对外提供服务）
		 *  用户管理系统：可配置权限，工作区
		 */
		team = 'team',

		/** 600元/100刀/1000欧 每月（100位） Discord在线支持Group */
		sponsor = 'sponsor',

		/** 6000元/1000刀/10000欧（12位） Discord在线支持Group 一对一支持 */
		gold_sponsor = 'gold_sponsor'
	}

	/** ¥120 终生（std）infinity作为user的一个属性存在 infinity用户不会再进行“可用性校验” */
	// infinity = boolean

	export type UserType = keyof typeof UserTypes
}
