# Better Mermaid for Logseq

一个可靠、离线、跟随主题的 Logseq Mermaid 插件。

## 功能

- 使用 Mermaid 11 在本地生成 SVG，不访问在线渲染服务。
- 支持 flowchart、sequence、class、state、ER、Gantt、mindmap、timeline 等 Mermaid 图表。
- 跟随 Logseq 明暗主题，也可以在插件设置或 Mermaid frontmatter 中指定主题。
- 内置 Monaco Editor；保存源码后自动刷新，语法错误直接显示在图表位置。
- 支持鼠标滚轮缩放、拖拽平移、视图状态保持、SVG 导出和高清 PNG 导出。
- 默认使用 Mermaid `strict` 安全级别；可信笔记可在设置中启用 `loose`。
- 可继续显示旧插件留下的 `{{renderer :mermaid_UUID}}` 宏。

## 使用

在 Logseq 中输入 `/Better Mermaid: 插入图表`。插件会创建：

````markdown
- {{renderer :better-mermaid}}
  - ```mermaid
    flowchart LR
      A[想法] --> B[Better Mermaid]
    ```
````

Mermaid 源码放在 renderer 块的第一个 Mermaid 子代码块中。修改代码块后，图表会自动更新。

## 本地安装

1. 运行 `bun install && bun run build`。
2. 在 Logseq 设置中启用 Developer mode。
3. 打开 Plugins，选择 Load unpacked plugin，然后选择本仓库根目录。

也可以解压 `release/logseq-better-mermaid-0.1.3.zip`，再通过 Load unpacked plugin 选择解压目录。

## 验证

```bash
bun run test
bun run build
bun run test:e2e
```

端到端测试会以 headless 模式启动隔离的 Logseq 0.10.12、创建临时 graph、加载未打包插件，并验证画布交互、Monaco 编辑、复杂图表、中文、错误提示、明暗主题以及 SVG/PNG 导出。测试不会显示窗口，也不会读写真实笔记 graph。

## 隐私

插件不包含网络请求。Mermaid 引擎随插件一起打包，所有渲染和导出都在本机完成。
