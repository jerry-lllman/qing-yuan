// 导入样式 - Vite 构建时会将其编译并输出到 dist/styles.css
import './styles/globals.css';

// Components
export * from './components/ui/avatar';
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/dialog';
export * from './components/ui/form';
export * from './components/ui/input';
export * from './components/ui/label';
export * from './components/ui/sonner';

// Utilities
export { cn } from './lib/utils';

// Form utilities - 重新导出 react-hook-form 和 zod resolver
export { useForm } from 'react-hook-form';
export { zodResolver } from '@hookform/resolvers/zod';
