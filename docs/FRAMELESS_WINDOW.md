# Electron 无边框窗口实现方案

> 本文档记录 Qyra 桌面应用实现类似 QQ 无边框窗口效果的调研和实现方案

---

## 背景

默认的 Electron 应用使用原生系统标题栏，我们希望实现类似 QQ 的无边框窗口效果，获得更现代化、更一致的用户界面。

---

## 方案对比

### 方案一：`titleBarStyle: 'hidden'` (macOS)

**适用平台**: macOS  
**效果**: 隐藏标题栏，但保留原生的红绿灯（关闭/最小化/最大化）按钮

```typescript
const mainWindow = new BrowserWindow({
  titleBarStyle: 'hidden',
  trafficLightPosition: { x: 10, y: 10 }, // 自定义红绿灯位置
});
```

**优点**:

- 保留原生窗口控制按钮，用户体验好
- 窗口拖拽体验流畅
- 无需自己实现窗口控制按钮

**缺点**:

- 仅 macOS 支持 `trafficLightPosition`
- Windows/Linux 上不生效

---

### 方案二：`titleBarStyle: 'hiddenInset'` (macOS)

**适用平台**: macOS  
**效果**: 类似 `hidden`，但红绿灯按钮内嵌更深，更适合需要左侧边栏的应用

```typescript
const mainWindow = new BrowserWindow({
  titleBarStyle: 'hiddenInset',
});
```

**优点**:

- 红绿灯按钮位置更自然
- 适合左侧有导航栏的布局

---

### 方案三：`frame: false` (完全无边框)

**适用平台**: Windows / macOS / Linux  
**效果**: 完全移除原生标题栏和边框

```typescript
const mainWindow = new BrowserWindow({
  frame: false,
});
```

**优点**:

- 完全自定义窗口外观
- 跨平台一致性

**缺点**:

- 需要自己实现窗口控制按钮（关闭、最小化、最大化）
- 需要自己实现窗口拖拽区域
- Windows 上需要处理窗口圆角和阴影
- macOS 上会失去原生红绿灯按钮的手势支持

---

### 方案四：`titleBarStyle: 'customButtonsOnHover'` (macOS)

**适用平台**: macOS  
**效果**: 红绿灯按钮在鼠标悬停时才显示

**适用场景**: 需要更大内容展示区域的应用

---

## 选定方案：跨平台最佳实践 ✅

结合各平台特点，采用差异化策略：

| 平台    | 策略                           | 窗口控制按钮   |
| ------- | ------------------------------ | -------------- |
| macOS   | `titleBarStyle: 'hiddenInset'` | 使用原生红绿灯 |
| Windows | `frame: false`                 | 自定义按钮组件 |
| Linux   | `frame: false`                 | 自定义按钮组件 |

### 主进程配置

```typescript
const mainWindow = new BrowserWindow({
  width: 900,
  height: 670,
  show: false,
  autoHideMenuBar: true,

  // macOS: 使用 hiddenInset 保留原生红绿灯
  // Windows/Linux: 完全无边框
  ...(process.platform === 'darwin'
    ? {
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
      }
    : {
        frame: false,
      }),

  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
  },
});
```

---

## 实现细节

### 1. 窗口拖拽区域 (CSS)

```css
/* 可拖拽区域 - 通常是顶部标题栏 */
.titlebar {
  -webkit-app-region: drag;
}

/* 按钮等交互元素必须设置为不可拖拽 */
.titlebar button,
.titlebar input,
.titlebar a {
  -webkit-app-region: no-drag;
}
```

### 2. IPC 通信（窗口控制）

#### Preload 脚本

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});
```

#### 主进程监听

```typescript
// main/index.ts
ipcMain.on('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});
```

### 3. TitleBar 组件

```tsx
// renderer/src/components/TitleBar/TitleBar.tsx
import { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = navigator.platform.toLowerCase().includes('mac');

  useEffect(() => {
    // 监听窗口最大化状态变化
    const checkMaximized = async () => {
      const maximized = await window.windowControls?.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();
  }, []);

  // macOS 使用原生红绿灯，不需要自定义按钮
  if (isMac) {
    return (
      <div className="h-10 flex items-center pl-20 -webkit-app-region-drag">
        {/* macOS: 左侧留空给红绿灯按钮 */}
      </div>
    );
  }

  // Windows/Linux: 自定义窗口控制按钮
  return (
    <div className="h-10 flex items-center justify-between -webkit-app-region-drag">
      <div className="flex items-center px-4">{/* Logo 或标题 */}</div>

      <div className="flex -webkit-app-region-no-drag">
        <button
          onClick={() => window.windowControls?.minimize()}
          className="w-12 h-10 hover:bg-gray-200 flex items-center justify-center"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => window.windowControls?.maximize()}
          className="w-12 h-10 hover:bg-gray-200 flex items-center justify-center"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => window.windowControls?.close()}
          className="w-12 h-10 hover:bg-red-500 hover:text-white flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
```

---

## macOS 红绿灯按钮注意事项

### 布局适配

macOS 的红绿灯按钮位于窗口左上角，需要在布局中预留空间：

```css
/* 左侧边栏顶部留空 */
.sidebar-header {
  padding-left: 80px; /* 给红绿灯按钮留空间 */
}
```

### trafficLightPosition

可以通过 `trafficLightPosition` 精确控制红绿灯位置：

```typescript
trafficLightPosition: { x: 16, y: 16 }
```

---

## 参考资料

- [Electron 无边框窗口文档](https://www.electronjs.org/docs/latest/tutorial/window-customization)
- [Electron BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window)

---

_创建时间: 2024-12-17_
