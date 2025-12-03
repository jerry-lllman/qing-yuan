/**
 * 错误码定义
 */

export const ErrorCode = {
  // 通用错误 (1xxx)
  UNKNOWN: 'E1000',
  VALIDATION_ERROR: 'E1001',
  NOT_FOUND: 'E1002',
  FORBIDDEN: 'E1003',
  RATE_LIMITED: 'E1004',

  // 认证错误 (2xxx)
  UNAUTHORIZED: 'E2000',
  TOKEN_EXPIRED: 'E2001',
  TOKEN_INVALID: 'E2002',
  CREDENTIALS_INVALID: 'E2003',
  ACCOUNT_DISABLED: 'E2004',

  // 用户错误 (3xxx)
  USER_NOT_FOUND: 'E3000',
  USER_ALREADY_EXISTS: 'E3001',
  USERNAME_TAKEN: 'E3002',
  EMAIL_TAKEN: 'E3003',

  // 好友错误 (4xxx)
  FRIEND_REQUEST_EXISTS: 'E4000',
  ALREADY_FRIENDS: 'E4001',
  FRIEND_REQUEST_NOT_FOUND: 'E4002',
  CANNOT_ADD_SELF: 'E4003',

  // 会话/消息错误 (5xxx)
  CONVERSATION_NOT_FOUND: 'E5000',
  MESSAGE_NOT_FOUND: 'E5001',
  NOT_CONVERSATION_MEMBER: 'E5002',
  MESSAGE_TOO_LONG: 'E5003',

  // 群组错误 (6xxx)
  GROUP_NOT_FOUND: 'E6000',
  NOT_GROUP_MEMBER: 'E6001',
  NOT_GROUP_ADMIN: 'E6002',
  GROUP_FULL: 'E6003',
  CANNOT_REMOVE_OWNER: 'E6004',

  // 文件错误 (7xxx)
  FILE_TOO_LARGE: 'E7000',
  FILE_TYPE_NOT_ALLOWED: 'E7001',
  UPLOAD_FAILED: 'E7002',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 错误消息映射 */
export const ErrorMessage: Record<ErrorCodeType, string> = {
  [ErrorCode.UNKNOWN]: '未知错误',
  [ErrorCode.VALIDATION_ERROR]: '参数验证失败',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.FORBIDDEN]: '无权限访问',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁',

  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.CREDENTIALS_INVALID]: '用户名或密码错误',
  [ErrorCode.ACCOUNT_DISABLED]: '账号已被禁用',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USERNAME_TAKEN]: '用户名已被使用',
  [ErrorCode.EMAIL_TAKEN]: '邮箱已被使用',

  [ErrorCode.FRIEND_REQUEST_EXISTS]: '好友请求已存在',
  [ErrorCode.ALREADY_FRIENDS]: '已经是好友',
  [ErrorCode.FRIEND_REQUEST_NOT_FOUND]: '好友请求不存在',
  [ErrorCode.CANNOT_ADD_SELF]: '不能添加自己为好友',

  [ErrorCode.CONVERSATION_NOT_FOUND]: '会话不存在',
  [ErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  [ErrorCode.NOT_CONVERSATION_MEMBER]: '非会话成员',
  [ErrorCode.MESSAGE_TOO_LONG]: '消息内容过长',

  [ErrorCode.GROUP_NOT_FOUND]: '群组不存在',
  [ErrorCode.NOT_GROUP_MEMBER]: '非群组成员',
  [ErrorCode.NOT_GROUP_ADMIN]: '非群组管理员',
  [ErrorCode.GROUP_FULL]: '群组人数已满',
  [ErrorCode.CANNOT_REMOVE_OWNER]: '不能移除群主',

  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.FILE_TYPE_NOT_ALLOWED]: '不支持的文件类型',
  [ErrorCode.UPLOAD_FAILED]: '上传失败',
};
