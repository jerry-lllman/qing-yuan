/**
 * 注册页面
 */

import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
  zodResolver,
} from '@qing-yuan/ui-web';
import { useAuth } from '@qing-yuan/client-state';
import { registerFormSchema, type RegisterFormInput } from '@qing-yuan/protocol';
import { authApi } from '@/api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isRegistering, error: authError } = useAuth({ api: authApi });

  const form = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      nickname: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormInput) => {
    try {
      await register({
        username: data.username,
        email: data.email,
        nickname: data.nickname,
        password: data.password,
      });
      // 注册成功，跳转到聊天页面
      navigate('/chat', { replace: true });
    } catch {
      // 错误已通过 useAuth 的 error 状态处理
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-[400px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">创建账户</CardTitle>
          <CardDescription className="text-center">注册一个新的 Qing Yuan 账户</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {authError.message}
                </div>
              )}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="3-20个字符，字母开头"
                        disabled={isRegistering}
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        disabled={isRegistering}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>昵称</FormLabel>
                    <FormControl>
                      <Input placeholder="显示名称" disabled={isRegistering} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="至少8个字符，含大小写字母和数字"
                        disabled={isRegistering}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>确认密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="再次输入密码"
                        disabled={isRegistering}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
