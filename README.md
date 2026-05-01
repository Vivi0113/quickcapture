# QuickCapture

> 工作知识盲点追踪器 — 快速记录遇到的不懂问题，随时提醒消化

![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/Electron-33.3.1-47848F?style=flat)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

| 功能 | 说明 |
|------|------|
| ⚡ **快速记录** | 全局快捷键 `Ctrl+Shift+Q` 呼出悬浮输入框，随时记录问题 |
| 📸 **智能截屏** | 记录时自动截取全屏，保留上下文 |
| 🔤 **OCR 识别** | 自动识别截屏中的文字，结合上下文理解问题 |
| 🤖 **AI 解释** | 调用 Claude / GPT 快速给出简明解释 |
| 🔍 **搜索引擎** | 一键 Google，带应用名搜索更精准 |
| ⏰ **定时提醒** | 系统通知提醒未解决的问题，工作日/每天可配 |
| 🏷️ **多维筛选** | 按状态/时间/应用过滤，快速找到问题 |
| 💾 **本地存储** | SQLite 数据库，所有数据本地保管 |

## 截图预览

### 悬浮输入框
按快捷键呼出，半透明悬浮窗，输入问题后回车即可记录。

### 主窗口
左侧问题列表 + 右侧详情面板，支持 AI 解释和 Google 搜索。

## 安装

### macOS / Windows

从 [Releases](https://github.com/YOUR_USERNAME/quickcapture/releases) 下载对应平台的安装包。

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/quickcapture.git
cd quickcapture

# 安装依赖
npm install

# 开发模式
npm run dev

# 打包
npm run dist:mac   # macOS
npm run dist:win   # Windows
```

### Linux 构建

Linux 下只能构建解压目录，不能生成 dmg/pkg：

```bash
npm run build
npx electron-builder --dir
```

## 使用方法

1. **首次启动**：运行后会在系统托盘显示图标
2. **记录问题**：按 `Ctrl+Shift+Q`（macOS 为 `Cmd+Shift+Q`）呼出输入框
3. **查看问题**：点击托盘图标打开主窗口
4. **获取 AI 解释**：点击问题 → AI 解释 tab（需配置 API Key）
5. **设置提醒**：主窗口 → 设置 → 配置提醒时间

## 配置说明

### AI API Key

支持三种模式：
- **Claude**：使用 Anthropic API
- **OpenAI**：使用 OpenAI API
- **自定义**：任何 OpenAI 兼容接口（如硅基流动、Claude API 等）

### 快捷键

默认：`Ctrl+Shift+Q`（macOS 为 `Cmd+Shift+Q`）

可在设置中修改。

### 提醒频率

- 每天
- 仅工作日（周一至周五）
- 关闭

## 技术栈

- **框架**：Electron 33
- **前端**：React 18 + TypeScript + Tailwind CSS
- **数据库**：SQLite（better-sqlite3）
- **AI**：Anthropic Claude / OpenAI GPT（流式输出）
- **OCR**：Tesseract.js（中英文识别）
- **构建**：electron-builder

## 项目结构

```
quickcapture/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts   # 入口，窗口/托盘管理
│   │   ├── capture.ts # 截图捕获
│   │   ├── database.ts # SQLite 操作
│   │   ├── ai.ts      # AI 接口调用
│   │   ├── ocr.ts     # Tesseract OCR
│   │   ├── reminder.ts # 定时提醒
│   │   ├── settings.ts # 设置管理
│   │   └── shortcut.ts # 全局快捷键
│   ├── preload/        # 预加载脚本
│   │   └── preload.ts
│   └── renderer/       # 渲染进程（React）
│       ├── main-window/  # 主窗口
│       │   ├── MainWindow.tsx
│       │   ├── QuestionList.tsx
│       │   ├── QuestionDetail.tsx
│       │   └── Settings.tsx
│       └── capture-window/ # 悬浮输入框
│           └── CaptureWindow.tsx
├── assets/icons/      # 应用图标
└── package.json
```

## License

MIT
