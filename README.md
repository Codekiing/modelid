# ModelID

打开网页即可使用的模型识别工具。复制三条题目，分别向同一个待测模型提问，将完整回答粘回网页，查看最相近的模型与候选排名。

识别计算全部在浏览器中完成；回答不上传服务器，不要求 API Key。页面只提供手动识别，没有自动调用模型、采集或指纹管理功能。GitHub Pages 负责提供网页文件，访问时仍适用 GitHub 的站点访问日志规则。

## 使用与发布

网站发布在 **https://codekiing.github.io/modelid/**。

本仓库根目录为完整的静态网站，无需安装依赖或构建。GitHub Pages 使用 `main` 分支的根目录发布，更新文件并推送后会自动重新部署。

本地预览可在本目录运行 `python3 -m http.server 8080`，再打开 http://127.0.0.1:8080/。ES 模块和指纹文件需要通过 HTTP 或 HTTPS 加载，不能直接双击 HTML 文件。

## 文件

| 文件 | 用途 |
| --- | --- |
| [index.html](index.html) | 识别页面与使用说明 |
| [app.js](app.js) | 题目展示、复制、回答输入和结果展示 |
| [style.css](style.css) | 界面样式 |
| [fingerprint-core.js](fingerprint-core.js) | ModelTrace 原版浏览器识别算法 |
| [challenge-browser.js](challenge-browser.js) | ModelTrace 原版题目生成 |
| [bank.json](bank.json) | 19 个模型指纹、684 份参考回答拟合得到的统计参数 |

更新模型时，用在本地完成建库与校准的 `unified_bank.json` 替换 `bank.json`，再推送即可。网页仓库只保存统计指纹，不包含原始采样回答、采集会话编号或密钥。

## 数据来源与限制

浏览器识别算法与题目生成直接采用 [ModelTrace / 6cd4a8ff0f3f4e49d6d6969dd2fbadfa1569fde2](https://github.com/xqy2006/ModelTrace/tree/6cd4a8ff0f3f4e49d6d6969dd2fbadfa1569fde2)，下载时按 Git 文件对象哈希核对，两份源码未改写。页面与交互基于本地 ModelID 项目。

初始参考数据来自 ModelTrace：GPT 288 份、Claude 360 份，共 18 个模型；上游标注 GPT 来源为 Codex、Claude 来源为 OAIPro。新增 `gpt-6.1-sol-codex-medium` 来自 2026 年 10 月 21 日采集的 36 份 Codex 回答，请求模型名为 `gpt-6.1-sol`，推理强度为 `medium`。新增样本有 12 题将系统前缀作为用户文本传入，另有 9 题省略模板中的 `Final task:` 连接标题，实际服务模型未经独立核实。

新增指纹在内部 12 组留出检查中，8 组匹配自身，4 组匹配 `gpt-6-astra`，仍存在混淆。网页概率表示当前候选库内的相对可能性，不能单独证明模型身份；未收录模型也会被匹配到某个候选。

保留上游 MIT 版权声明，详见 [LICENSE](LICENSE)。
