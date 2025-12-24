import { useContact, useChatStore } from '@qyra/client-state';
import { Button } from '@qyra/ui-web';
import { createChatApi } from '@qyra/client-core';
import { contactApi } from '@renderer/api/contact';
import { useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';

// 创建 Chat API 实例
const chatApi = createChatApi();

export default function ContactList() {
  /// 顶部搜索
  /// 新朋友
  /// 好友列表

  const { receivedRequests, friends, acceptFriendRequest } = useContact({
    api: contactApi,
  });

  // Chat Store - 用于添加会话
  const addChat = useChatStore((state) => state.addChat);

  const navigate = useNavigate();
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);

  // 发起会话 - 创建或获取私聊会话后跳转
  const handleStartChat = useCallback(
    async (targetUserId: string) => {
      try {
        setStartingChatUserId(targetUserId);
        // 调用 API 创建或获取私聊会话
        const conversation = await chatApi.createPrivateChat(targetUserId);
        // 添加到本地 store（如果已存在会更新）
        addChat(conversation);
        // 使用会话 ID 进行导航
        navigate(`/chat/${conversation.id}`);
      } catch (error) {
        console.error('[ContactList] Failed to create/get chat:', error);
      } finally {
        setStartingChatUserId(null);
      }
    },
    [navigate, addChat]
  );

  return (
    <div>
      <div>新朋友</div>
      <div>
        {receivedRequests.map((request) => (
          <div key={request.id}>
            <div>
              {request.sender.nickname}({request.sender.email})
            </div>
            <div>{request.message}</div>
            <Button onClick={() => acceptFriendRequest(request.id)}>同意</Button>
          </div>
        ))}
      </div>

      <div>好友列表</div>
      <div>
        {friends.map((friendItem) => (
          <div key={friendItem.id}>
            <div>
              {friendItem.remark ?? friendItem.friend.nickname ?? friendItem.friend?.username} (
              {friendItem.friend.email})
            </div>
            <Button
              onClick={() => handleStartChat(friendItem.friend.id)}
              disabled={startingChatUserId === friendItem.friend.id}
            >
              {startingChatUserId === friendItem.friend.id ? '加载中...' : '发起会话'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
