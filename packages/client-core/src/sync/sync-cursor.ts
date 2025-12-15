/**
 * 同步游标管理
 * 负责游标的存储、读取和更新
 */

import type { IStorageAdapter } from '../storage/types';
import type { SyncCursor } from './types';

/** 游标存储键前缀 */
const CURSOR_KEY_PREFIX = 'sync:cursor:';

/** 全局游标键 */
const GLOBAL_CURSOR_KEY = `${CURSOR_KEY_PREFIX}global`;

/**
 * 同步游标管理器
 */
export class SyncCursorManager {
  constructor(private readonly storage: IStorageAdapter) {}

  /**
   * 获取全局同步游标
   */
  async getGlobalCursor(): Promise<SyncCursor> {
    const cursor = await this.storage.get<SyncCursor>(GLOBAL_CURSOR_KEY);
    return cursor ?? this.createEmptyCursor();
  }

  /**
   * 保存全局同步游标
   */
  async saveGlobalCursor(cursor: SyncCursor): Promise<void> {
    await this.storage.set(GLOBAL_CURSOR_KEY, cursor);
  }

  /**
   * 获取指定会话的同步游标
   */
  async getChatCursor(chatId: string): Promise<SyncCursor> {
    const key = `${CURSOR_KEY_PREFIX}chat:${chatId}`;
    const cursor = await this.storage.get<SyncCursor>(key);
    return cursor ?? this.createEmptyCursor(chatId);
  }

  /**
   * 保存指定会话的同步游标
   */
  async saveChatCursor(chatId: string, cursor: SyncCursor): Promise<void> {
    const key = `${CURSOR_KEY_PREFIX}chat:${chatId}`;
    await this.storage.set(key, { ...cursor, chatId });
  }

  /**
   * 更新游标（合并新数据后的游标）
   */
  async updateCursor(
    cursor: SyncCursor,
    lastMessageId: string,
    timestamp?: number
  ): Promise<SyncCursor> {
    const updatedCursor: SyncCursor = {
      ...cursor,
      lastMessageId,
      lastSyncTime: timestamp ?? Date.now(),
    };

    if (cursor.chatId) {
      await this.saveChatCursor(cursor.chatId, updatedCursor);
    } else {
      await this.saveGlobalCursor(updatedCursor);
    }

    return updatedCursor;
  }

  /**
   * 重置全局游标（用于全量同步）
   */
  async resetGlobalCursor(): Promise<void> {
    await this.storage.set(GLOBAL_CURSOR_KEY, this.createEmptyCursor());
  }

  /**
   * 重置指定会话的游标
   */
  async resetChatCursor(chatId: string): Promise<void> {
    const key = `${CURSOR_KEY_PREFIX}chat:${chatId}`;
    await this.storage.set(key, this.createEmptyCursor(chatId));
  }

  /**
   * 清除所有游标
   */
  async clearAllCursors(): Promise<void> {
    const keys = await this.storage.keys(CURSOR_KEY_PREFIX);
    if (keys.length > 0) {
      await this.storage.removeMany(keys);
    }
  }

  /**
   * 获取所有会话的游标
   */
  async getAllChatCursors(): Promise<Map<string, SyncCursor>> {
    const prefix = `${CURSOR_KEY_PREFIX}chat:`;
    const keys = await this.storage.keys(prefix);
    const cursors = new Map<string, SyncCursor>();

    for (const key of keys) {
      const chatId = key.replace(prefix, '');
      const cursor = await this.storage.get<SyncCursor>(key);
      if (cursor) {
        cursors.set(chatId, cursor);
      }
    }

    return cursors;
  }

  /**
   * 创建空游标
   */
  private createEmptyCursor(chatId?: string): SyncCursor {
    return {
      lastMessageId: null,
      lastSyncTime: 0,
      chatId,
    };
  }
}
