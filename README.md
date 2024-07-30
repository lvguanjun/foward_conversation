# Forward Conversation API

此项目为 Serverless API，专门处理来自 `/backend-api/conversation` 的 POST 请求。其主要功能是进行道德审核判断，并将请求转发到指定的后端服务。

## 技术栈

- Node.js
- Vercel Serverless Functions
- OpenAI API

## 功能描述

- 转发请求到指定的后端服务。
    - 接收 `/backend-api/conversation` 的 POST 请求。
    - 对请求内容进行道德审核。
    - 根据审核结果，决定是否转发请求到新的服务器。

## 部署到 Vercel

您可以通过点击下面的按钮直接在 Vercel 上部署这个项目：

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/lvguanjun/foward_conversation)

### 环境变量

在 Vercel 上部署时，您需要设置以下环境变量：

- `OPENAI_API_KEY`: 您的 OpenAI API 密钥，用于道德审核。
- `OPENAI_BASE_URL`: OpenAI API 的基础 URL。可自定义反代地址，非必填。默认 `https://api.openai.com` 。
- `MODERATION_ERROR_MESSAGE`: 道德审核接口返回错误时的提示信息。
- `MODERATION_BLOCK_MESSAGE`: 道德审核不通过时的提示信息。

## 本地开发

1. 克隆仓库：
   ```bash
   git clone https://github.com/lvguanjun/foward_conversation.git
   ```
2. 安装依赖：
   ```bash
   cd foward_conversation
   npm install
   ```
3. 设置环境变量：
   - 创建 `.env` 文件并设置 `OPENAI_API_KEY` 为您的 OpenAI API 密钥。

4. 运行项目：
   ```bash
   npm start
   ```

## 贡献

如果你想为这个项目贡献代码，欢迎 Fork 并提交 Pull Request。我们非常欢迎所有形式的贡献，希望共同改进此项目。

## 许可证

此项目遵循 MIT 许可证。