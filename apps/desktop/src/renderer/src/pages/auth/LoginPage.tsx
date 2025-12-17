/**
 * 登录页面
 */

import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
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
import { loginSchema, type LoginInput } from '@qyra/protocol';
import { ApiRequestError } from '@qyra/client-core';
import { authApi } from '@/api/auth';
import logo from '@qyra/assets/images/logo.png';

/** 表单字段名类型 */
type FormFieldName = keyof LoginInput;

/** 有效的表单字段列表 */
const FORM_FIELDS: FormFieldName[] = ['account', 'password'];

/** 检查字段名是否有效 */
function isValidField(field: string): field is FormFieldName {
  return FORM_FIELDS.includes(field as FormFieldName);
}

/** 类型保护：检查是否为 ApiRequestError */
function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoggingIn } = useAuth({ api: authApi });

  // 登录后跳转的目标页面
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/chat';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      account: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
      // 登录成功，跳转到目标页面
      navigate(from, { replace: true });
    } catch (err) {
      // 从后端错误中提取 field 信息
      if (isApiRequestError(err) && err.field && isValidField(err.field)) {
        // 后端返回了具体字段，映射到表单
        form.setError(err.field, { type: 'server', message: err.message });
      } else {
        // 无 field 信息，设置为 root 错误
        const message = err instanceof Error ? err.message : '登录失败';
        form.setError('root', { type: 'server', message });
      }
    }
  };

  return (
    <Card className="w-100">
      <CardHeader className="space-y-1">
        <img src={logo} alt="Qyra Logo" className="w-24 h-24 mx-auto" />
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
              name="account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名/邮箱</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入用户名或邮箱"
                      disabled={isLoggingIn}
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="请输入密码"
                      disabled={isLoggingIn}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? '登录中...' : '登录'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              还没有账户？{' '}
              <Link to="/register" className="text-primary hover:underline">
                立即注册
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
