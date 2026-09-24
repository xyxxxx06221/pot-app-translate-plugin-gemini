# Pot Gemini 翻译插件（OpenAI 兼容）

为 [Pot](https://pot-app.com/) 提供 Gemini 文本翻译，支持 Google 官方 OpenAI 兼容接口，以及采用相同协议的中转服务。

**原作者：[Tzulao55](https://github.com/Tzulao55)。本项目基于其 [DeepSeek 翻译插件](https://github.com/tzulao55/pot-app-translate-plugin-deepseek) 修改，感谢原作者的开源贡献。** 本项目沿用 GPL-3.0 许可证，是独立维护的非官方 Gemini 适配版本。

## 下载与安装

1. 下载发布包 `plugin.com.pot-app.gemini-openai-compatible.potext`。最新发布见 [Releases](https://github.com/xyxxxx06221/pot-app-translate-plugin-gemini/releases)。
2. 打开 Pot → 偏好设置 → 服务设置 → 翻译 → 添加外部插件 → 安装外部插件。
3. 选择 `.potext` 文件，无需解压。
4. 将 **Gemini（OpenAI 兼容）** 添加到翻译服务列表，填写配置并保存。

更新时重新导入新版安装包，然后关闭并重新打开翻译窗口。也可以从 Actions 下载自动打包产物，或按下文自行打包。

## 配置

| 配置项 | Google 官方 API | OpenAI 兼容中转服务 |
| --- | --- | --- |
| API 密钥 | 自行在 [Google AI Studio](https://aistudio.google.com/apikey) 申请 | 使用中转服务提供的密钥 |
| 接口地址 | `https://generativelanguage.googleapis.com/v1beta/openai` | 服务方提供的 Base URL，例如 `https://your-provider.example/v1` |
| 模型名称 | 默认 `gemini-3.1-flash-lite`，可自行修改 | 填写该服务 `/models` 返回的准确模型 ID |

发布包不附带任何可用密钥或个人配置，安装后需自行填写。部分 Pot 版本不会自动填入默认值，请手动填写上表中的接口地址和模型名称。

### 接口地址如何填写

- 支持 Base URL，也支持以 `/chat/completions` 结尾的完整请求地址。
- 插件自动添加 `/chat/completions`，不会重复添加；末尾斜杠会自动处理。
- 如果服务要求 `/v1` 等路径前缀，必须一并填写，不能只填域名和端口。
- Gemini 原生 `:generateContent` 地址不适用。本插件使用 **OpenAI Chat Completions** 协议。
- 密钥和待翻译原文发送到你配置的接口地址。

### 模型选择

默认 `gemini-3.1-flash-lite` 适合作为日常短句、网页和划词翻译的起点。可按实际可用性和译文需求切换其他 Gemini 文本模型。

以接口返回的准确模型 ID 为准，不能直接复制服务界面中的显示名称（例如带空格、括号的模型名称）。部分中转服务提供带思考强度后缀的模型别名，这些别名不一定适用于 Google 官方 API。模型可用性和额度以所用服务为准。

## 功能

- 保留原插件的 Pot 翻译接口，支持可配置模型与接口地址。
- 使用 `POST /chat/completions`、Bearer 鉴权及 `messages` 格式，无需安装 SDK。
- 仅输出译文，提示模型不要额外添加「源语言：英语」等说明。
- 保留段落、格式和有意义的引号，区分简繁中文、葡萄牙/巴西葡语等。
- 对无效密钥、模型不存在、配额不足、空结果和截断结果提供错误提示。
- 兼容 `utils.tauriFetch` 与 `utils.http.fetch`，采用非流式返回，完成整段翻译后显示结果。
- 独立插件 ID，可与原版 DeepSeek 插件同时安装。

## 常见问题

**HTTP 404：** 核对请求地址是否缺少 `/v1`，并确认模型 ID 是服务当前支持的名称。

**模型已停用：** 查询服务的最新模型列表并更换名称。中转平台的旧别名可能仍指向已停用模型。

**等待较久：** 选择较轻量的模型或降低服务支持的思考强度。当前版本在收到完整响应后一次性显示译文，速度还受网络、服务排队和原文长度影响。

**额外出现语言说明：** 本版本已在提示词中明确禁止添加语言标签。模型输出仍可能存在波动，更新后请重新发起翻译。

## 本地验证与打包

需要 Node.js 18+ 和 Python 3，无需安装额外依赖。

```sh
node tests/translate.test.cjs
python build.py
```

安装包生成于 `dist/`。打包采用固定文件清单，仅包含 `main.js`、`info.json`、图标、许可证、署名说明和 README；不会读取 Pot 配置、环境变量或用户密钥。

仓库的自动检查只执行模拟 HTTP 测试，不需要真实 API 密钥。已对本地 OpenAI 兼容中转服务进行翻译验证；Google 官方端点与其他中转服务的可用性需按各自配置验证。

## 原作者与许可

- 原作者：**[Tzulao55](https://github.com/Tzulao55)**。
- 上游项目：**[pot-app-translate-plugin-deepseek](https://github.com/tzulao55/pot-app-translate-plugin-deepseek)**。
- 参考提交：`b284b8af25d69825bcc4e068bef1ec014ca69316`。
- Gemini 适配维护：**[xyxxxx06221](https://github.com/xyxxxx06221)**。
- 修改日期：2026-09-24。修改涉及 Gemini 兼容请求、可配置接口和模型、语言映射、提示词、错误处理、测试及打包。
- 沿用上游 **GPL-3.0**，完整许可证见 [LICENSE](LICENSE)，署名说明见 [NOTICE](NOTICE)。

参考：[Gemini OpenAI 兼容接口](https://ai.google.dev/gemini-api/docs/openai) · [模型列表](https://ai.google.dev/gemini-api/docs/models) · [Pot 插件模板](https://github.com/pot-app/pot-app-translate-plugin-template)
