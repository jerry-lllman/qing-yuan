/**
 * 业务限制常量
 */

export const Limits = {
  // 用户相关
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NICKNAME_MAX_LENGTH: 32,
  BIO_MAX_LENGTH: 200,

  // 消息相关
  MESSAGE_MAX_LENGTH: 10000,
  ATTACHMENTS_MAX_COUNT: 9,

  // 文件相关
  FILE_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB

  // 群组相关
  GROUP_NAME_MAX_LENGTH: 50,
  GROUP_ANNOUNCEMENT_MAX_LENGTH: 500,
  GROUP_MEMBERS_MAX: 500,

  // 分页
  PAGE_SIZE_DEFAULT: 20,
  PAGE_SIZE_MAX: 100,

  // 好友
  FRIEND_REQUEST_MESSAGE_MAX_LENGTH: 100,

  // 请求限制
  RATE_LIMIT_MESSAGE_PER_MINUTE: 60,
  RATE_LIMIT_API_PER_MINUTE: 100,
} as const;

/** 允许的图片类型 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** 允许的文件类型 */
export const ALLOWED_FILE_TYPES = [
  // 图片
  ...ALLOWED_IMAGE_TYPES,
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // 压缩包
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // 音频
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // 视频
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;
