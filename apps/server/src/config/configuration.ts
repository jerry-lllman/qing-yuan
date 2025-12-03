/**
 * 应用配置
 */
export default () => ({
  // 服务器配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis 配置
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  // 文件上传配置
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  },

  // 推送通知配置
  push: {
    fcmServerKey: process.env.FCM_SERVER_KEY,
    apnsKeyId: process.env.APNS_KEY_ID,
    apnsTeamId: process.env.APNS_TEAM_ID,
  },

  // S3 配置
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  },
});
