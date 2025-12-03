import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '用户名/邮箱不能为空' })
  account: string; // 用户名或邮箱

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
