import { useContact } from '@qyra/client-state';
import { Button } from '@qyra/ui-web';
import { contactApi } from '@renderer/api/contact';
import { useNavigate } from 'react-router-dom';

export default function ContactList() {
  /// 顶部搜索
  /// 新朋友
  /// 好友列表

  const { friends, receivedRequests, acceptFriendRequest } = useContact({
    api: contactApi,
  });
  // {
  //             "id": "cmjcik1kg0006lww8v10mv9ee",
  //             "senderId": "cmj8mq18v0006lweggmy2fvje",
  //             "receiverId": "cmj8myksi000clwegb94e5kfg",
  //             "message": "你好，我想加你为好友",
  //             "status": "PENDING",
  //             "createdAt": "2025-12-19T06:53:56.849Z",
  //             "updatedAt": "2025-12-19T06:53:56.849Z",
  //             "sender": {
  //                 "id": "cmj8mq18v0006lweggmy2fvje",
  //                 "username": "jerry",
  //                 "nickname": "Jerry",
  //                 "avatar": null,
  //                 "bio": null
  //             }
  //         }

  const navigate = useNavigate();

  return (
    <div>
      <div>新朋友</div>
      <div>
        {receivedRequests.map((request) => (
          <div key={request.id}>
            <div>{request.sender.nickname}</div>
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
              {friendItem.remark ?? friendItem.friend.nickname ?? friendItem.friend?.username}
            </div>
            <Button onClick={() => navigate(`/chat/${friendItem.friend.id}`)}>发起会话</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
