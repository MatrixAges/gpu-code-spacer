export default {
	not_login: '未登录，请登录后操作',
	migrating: '版本更新，数据迁移中，切勿关闭应用',
	too_many_req: '短时间请求过多，请稍后再试',
	paying: '支付中...',
	done: '已完成',
	auth: {
		validate_error: '参数验证错误，请确认参数是否正确',
		test_title: '测试是否能连接到服务器',
		test_ok: '接口测试通过',
		test_failed: '接口测试失败，您所在地区网络异常，请切换网络，使用手机热点连接电脑或使用代理访问',
		signup: '注册',
		signin: '登录',
		confirm_password: '确认密码',
		confirm_password_error: '密码不一致',
		send_captcha: '发送验证码',
		resend_captcha: '{{time}}s后重发',
		send_captcha_done: '验证码已发送至您的邮箱',
		confirm: '已达到免费版使用上限，前往订阅？',
		not_login: '登录已过期，请重新登录！',
		email_not_input: '未输入邮箱',
		send_verify_code_exsit: '验证码已发送，请六分钟之后再试',
		send_verify_code_error: '获取验证码失败',
		mid_exist: '该设备已注册账号，无法重复注册',
		email_exist: '该邮箱已注册账号，无法重复注册',
		verify_code_error: '验证码错误',
		db_insert_error: '数据库添加用户失败',
		db_update_error: '数据库更新用户失败',
		db_delete_error: '数据库删除用户失败',
		signup_success: '注册成功',
		user_not_exist: '用户不存在',
		verify_password_error: '密码错误',
		signin_success: '登录成功',
		token_error: '登录凭证验证失败，请重新登录',
		refresh_token_error: '登录凭证刷新令牌验证失败，请重新登录',
		activation_code_not_exist: '激活码不存在',
		activation_code_expired: '激活码已过期',
		activation_code_user_not_match: '激活码用户不匹配',
		activation_code_used: '激活码已被使用',
		slider_captcha: {
			default: '向右拖动滑块填充拼图',
			loading: '加载中',
			verifying: '验证中',
			error: '失败'
		},
		signout: '注销',
		passport: '用户码',
		activate: '激活',
		activate_code: '激活码',
		activate_success: '激活成功',
		shutdown: {
			title: '销户',
			confirm: {
				title: '销毁账户',
				content: '您的用户数据将会被全部销毁，您存储在本地的数据将不会受到影响，账户销毁后不可恢复，确认销毁账户？'
			}
		}
	},
	search: {
		to_navigate: '切换',
		to_select: '选择',
		to_close: '关闭',
		history: '搜索历史'
	},
	screenlock: {
		set_password: `$t(common.set)$t(common.password)`,
		reset_password: `$t(common.reset)$t(common.password)`,
		copied: '$t(common.secret_key)$t(common.copied)',
		password_placeholder: '$t(common.input)$t(common.screenlock)$t(common.password)',
		generate_secret_key: '$t(common.generate)$t(common.secret_key)',
		secret_key_placeholder: '请输入生成的密钥',
		desc: '密钥可用来解锁和重置密码，请务必妥善保存',
		use_x_reset: '$t(common.use){{mode}}$t(common.reset)',
		lock: '锁定屏幕',
		lock_email_text: '发送上方请求码到下方邮箱，一至三个工作日内解锁码将发送到您的邮箱',
		lock_password_placeholder: '$t(common.input)$t(common.password)',
		unlock_placeholder: '输入解锁码',
		in_lock_mode: '已处于锁定模式',
		email_code_placeholder: '输入邮箱接收到的密钥',
		forget_password: '忘记密码',
		use_password: '使用密码'
	},
	ErrorBoundary: {
		title: '运行错误',
		desc: '程序发生了未知异常'
	}
}
