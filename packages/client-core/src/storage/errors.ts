export enum StorageErrorCode {
  /** 初始化失败 */
  INIT_FAILED = 'INIT_FAILED',
  /** 未找到 */
  NOT_FOUND = 'NOT_FOUND',
  /** 写入失败 */
  WRITE_FAILED = 'WRITE_FAILED',
  /** 读取失败 */
  READ_FAILED = 'READ_FAILED',
  /** 序列化失败 */
  SERIALIZATION_FAILED = 'SERIALIZATION_FAILED',
  /** 反序列化失败 */
  DESERIALIZATION_FAILED = 'DESERIALIZATION_FAILED',
  /** 存储已满 */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  /** 存储不可用 */
  UNAVAILABLE = 'UNAVAILABLE',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public override readonly cause?: Error;

  constructor(message: string, code: StorageErrorCode, cause?: Error) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }

  static initFailed(message: string, cause?: Error): StorageError {
    return new StorageError(message, StorageErrorCode.INIT_FAILED, cause);
  }

  static notFound(key: string): StorageError {
    return new StorageError(`Key not found: ${key}`, StorageErrorCode.NOT_FOUND);
  }

  static writeFailed(key: string, cause?: Error): StorageError {
    return new StorageError(`Failed to write key: ${key}`, StorageErrorCode.WRITE_FAILED, cause);
  }

  static readFailed(key: string, cause?: Error): StorageError {
    return new StorageError(`Failed to read key: ${key}`, StorageErrorCode.READ_FAILED, cause);
  }

  static quotaExceeded(cause?: Error): StorageError {
    return new StorageError('Storage quota exceeded', StorageErrorCode.QUOTA_EXCEEDED, cause);
  }
}
