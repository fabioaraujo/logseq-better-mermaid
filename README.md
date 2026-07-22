# Better Mermaid for Logseq

A fast, offline, interactive Mermaid viewer and editor for Logseq.

[简体中文](./README.zh-CN.md)

![Better Mermaid in Logseq](./test-results/e2e/flowchart-light.png)

## Features

- Mermaid 11 rendering, fully local and offline.
- Interactive canvas: wheel zoom, mouse drag to pan, double-click to fit, and persistent view state.
- Built-in Monaco Editor with Mermaid highlighting, line numbers, search, and keyboard shortcuts.
- Flowcharts, sequence, class, state, ER, Gantt, mindmap, timeline, pie, git graph, and more.
- Automatic light/dark theme support, inline syntax errors, SVG export, and high-resolution PNG export.
- English, Simplified Chinese, and Traditional Chinese UI following Logseq's preferred language.
- Compatibility with `{{renderer :mermaid_UUID}}` macros left by older Mermaid plugins.

## Usage

Run `/Better Mermaid: Insert diagram` in Logseq. The plugin creates:

````markdown
- {{renderer :better-mermaid}}
  - ```mermaid
    flowchart LR
      A[Idea] --> B[Better Mermaid]
    ```
````

The Mermaid source remains a standard child code block. Use **Edit** on the diagram toolbar to open Monaco Editor, or edit the child block directly.

## Install from source

1. Run `bun install && bun run build`.
2. Enable Developer mode in Logseq settings.
3. Open Plugins, choose **Load unpacked plugin**, and select this repository.

Alternatively, download `logseq-better-mermaid-0.1.3.zip` from GitHub Releases and load its extracted directory.

## Development

```bash
bun install
bun run test
bun run build
bun run test:e2e
```

The end-to-end suite starts an isolated Logseq 0.10.12 in headless mode. It does not display a window or access your real graph.

## Privacy and security

Better Mermaid makes no network requests while rendering or editing. Mermaid and Monaco are bundled with the plugin. The default Mermaid security level is `strict`; enable `loose` only for trusted notes.

## License

[MIT](./LICENSE)
