/**
 * TitleBar 组件类型定义
 */

export interface TitleBarProps {
  /** 是否显示为透明背景（用于叠加在内容上） */
  transparent?: boolean;
  /** 是否显示应用 Logo */
  showLogo?: boolean;
  /** 是否展示用户信息 */
  showUserInfo?: boolean;
  /** 自定义类名 */
  className?: string;
}

export interface WindowControlsProps {
  /** 当前窗口是否最大化 */
  isMaximized: boolean;
  /** 最小化窗口回调 */
  onMinimize: () => void;
  /** 最大化/还原窗口回调 */
  onMaximize: () => void;
  /** 关闭窗口回调 */
  onClose: () => void;
}

export interface UserInfoProps {
  /** 用户头像 URL */
  avatar?: string | null;
  /** 用户昵称 */
  nickname?: string | null;
  /** 用户名（昵称为空时的备选） */
  username?: string | null;
  /** 用户签名 */
  bio?: string | null;
  /** 自定义类名 */
  className?: string;
}

export interface TitleBarLogoProps {
  /** Logo 图片源 */
  src: string;
  /** 自定义类名 */
  className?: string;
}
