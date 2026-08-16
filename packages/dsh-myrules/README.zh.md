# dsh-myrules

在 DeepSeek Harness（DSH）Web 设置页编辑**此主机的全局指令**。设置页新增「个性化」页：一个多行编辑器，对应 `$DSH_HOME/AGENTS.md`——这个文件会被 [dsh-agent-instructions](https://github.com/deepseek-ai/dsh-agent-instructions) 注入**此机器上的每一个会话**，作为持久指令块生效。

编辑保存后：**新会话立即生效**；当前会话在下次文件操作后感知。无需重启。

## 安装

```sh
dsh plugin --profile web add dsh-myrules@0.1.1
```

重启 `dsh web`，然后打开 **设置 → 个性化**。

## 使用

1. 打开 **设置 → 个性化**
2. 编辑你的自定义指令（Markdown 格式，可多条，换行分隔）
3. 点击 **保存**

保存很简单：

- **清空内容**保存会删除指令文件（清除全局指令），需要确认
- 超过 64 KB 指令预算时仍会保存，但提示警告（渲染器会先省略较宽泛的文件、再截断最具体的文件）

## 工作原理

- **宿主侧**（`lib/host.js`）：`TypertRemoteService` 网关，wire 命名空间 `myRules`——`readGlobalRules` / `writeGlobalRules` 两个方法。文件路径经 `$DSH_HOME` 解析（配置 → 环境变量 → `~/.dsh`）。
- **浏览器侧**（`lib/client.js`）：标准 client-modules bundle，注册 `settings.section` 页面；完整中英双语。
- **生效机制**：无需热重载——DSH 内置的 `dsh-agent-instructions` 监听 user-global scope，文件变化后自动重新注入。

## 许可证

MIT
