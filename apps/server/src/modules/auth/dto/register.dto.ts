import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * 自定义校验器：确认密码必须与密码一致
 */
@ValidatorConstraint({ name: 'matchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    const object = args.object as RegisterDto;
    return confirmPassword === object.password;
  }

  defaultMessage(): string {
    return '两次输入的密码不一致';
  }
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(20, { message: '用户名最多 20 个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(50, { message: '密码最多 50 个字符' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '确认密码不能为空' })
  @Validate(MatchPasswordConstraint)
  confirmPassword: string;

  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MinLength(1, { message: '昵称至少 1 个字符' })
  @MaxLength(30, { message: '昵称最多 30 个字符' })
  nickname: string;
}
