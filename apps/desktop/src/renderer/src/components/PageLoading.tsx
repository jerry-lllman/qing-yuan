/**
 * 页面加载中状态组件
 * 用于 Suspense fallback
 */

export default function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">加载中...</div>
    </div>
  );
}
