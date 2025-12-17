/**
 * 注册页面
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@qing-yuan/ui-web';
import { useAuth } from '@qing-yuan/client-state';
import { authApi } from '@/api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isRegistering, error: authError } = useAuth({ api: authApi });

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // UI 层只处理 confirmPassword 比对（这是纯 UI 逻辑，不传给 API）
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      // 数据验证由 API 层统一处理
      await register({
        username: username.trim(),
        email: email.trim(),
        nickname: nickname.trim(),
        password,
      });
      // 注册成功，跳转到聊天页面
      navigate('/chat', { replace: true });
    } catch {
      // 错误已通过 useAuth 的 error 状态处理，无需额外操作
    }
  };

  const displayError = error || authError?.message;

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-[400px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">创建账户</CardTitle>
          <CardDescription className="text-center">注册一个新的 Qing Yuan 账户</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {displayError}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="用户名（3-20个字符，字母数字下划线）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isRegistering}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="昵称（显示名称）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="密码（至少6个字符）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isRegistering}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isRegistering}>
              {isRegistering ? '注册中...' : '注册'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              已有账户？{' '}
              <Link to="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
