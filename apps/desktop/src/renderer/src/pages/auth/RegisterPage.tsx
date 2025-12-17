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
} from '@qyra/ui-web';
import { useAuth } from '@qyra/client-state';
import { registerFormSchema, type RegisterFormInput } from '@qyra/protocol';
import { ApiRequestError } from '@qyra/client-core';
import { authApi } from '@/api/auth';

/** 表单字段名类型 */
type FormFieldName = keyof RegisterFormInput;

/** 有效的表单字段列表 */
const FORM_FIELDS: FormFieldName[] = [
  'username',
  'email',
  'nickname',
  'password',
  'confirmPassword',
];

/** 检查字段名是否有效 */
function isValidField(field: string): field is FormFieldName {
  return FORM_FIELDS.includes(field as FormFieldName);
}

/** 类型保护：检查是否为 ApiRequestError */
function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isRegistering } = useAuth({ api: authApi });

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
      await register(data);
      // 注册成功，跳转到聊天页面
      navigate('/chat', { replace: true });
    } catch (err) {
      // 从后端错误中提取 field 信息
      if (isApiRequestError(err) && err.field && isValidField(err.field)) {
        // 后端返回了具体字段，映射到表单
        form.setError(err.field, { type: 'server', message: err.message });
      } else {
        // 无 field 信息，设置为 root 错误
        const message = err instanceof Error ? err.message : '注册失败';
        form.setError('root', { type: 'server', message });
      }
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-100">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">创建账户</CardTitle>
          <CardDescription className="text-center">注册一个新的 Qing Yuan 账户</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {form.formState.errors.root.message}
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
                        onBlur={(e) => {
                          field.onChange(e.target.value.trim());
                          field.onBlur();
                        }}
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
                        onBlur={(e) => {
                          field.onChange(e.target.value.trim());
                          field.onBlur();
                        }}
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
                      <Input
                        placeholder="显示名称"
                        disabled={isRegistering}
                        {...field}
                        onBlur={(e) => {
                          field.onChange(e.target.value.trim());
                          field.onBlur();
                        }}
                      />
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
                        placeholder="请输入密码"
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
