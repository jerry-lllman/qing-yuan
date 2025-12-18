import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@qyra/ui-web';

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping');

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-100">
        <CardHeader>
          <CardTitle className="text-center">Qyra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">即时通讯桌面端</p>
          <Input placeholder="用户名" />
          <Input type="password" placeholder="密码" />
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline">
              注册
            </Button>
            <Button className="flex-1" onClick={ipcHandle}>
              登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
