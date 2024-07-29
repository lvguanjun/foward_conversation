// 文件路径: /api/conversation.js

import fetch from "node-fetch";

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const openaiApiKey = process.env.OPENAI_API_KEY; // 从环境变量获取 OpenAI API 密钥

  if (url.pathname === "/backend-api/conversation") {
    const requestBody = await req.json(); // 读取 JSON 请求体
    const userMessages = requestBody.messages
      .filter(
        (msg) =>
          msg.author.role === "user" && msg.content.content_type === "text"
      )
      .map((msg) => msg.content.parts.join(" "));

    if (userMessages.length > 0) {
      const moderationResult = await checkContentForModeration(
        userMessages,
        openaiApiKey
      );
      if (moderationResult.error) {
        return res
          .status(503)
          .json({ detail: "道德审核接口错误，请稍后再试。" });
      }
      if (moderationResult.shouldBlock) {
        return res.status(451).json({ detail: "公益不易，请珍惜账号喵！" });
      }
    }

    url.host = "new.oaifree.com";
    const newRequestOptions = {
      body: JSON.stringify(requestBody),
      method: req.method,
      headers: req.headers,
    };
    const newResponse = await fetch(
      `https://${url.host}${url.pathname}`,
      newRequestOptions
    );
    const responseData = await newResponse.json();
    return res.status(newResponse.status).json(responseData);
  }

  res.status(404).send("Not found");
}

async function checkContentForModeration(messages, apiKey) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: messages }),
  });

  if (response.ok) {
    const data = await response.json();
    return {
      shouldBlock: data.results.some((result) => result.flagged),
    };
  } else {
    console.error("Moderation API returned an error:", response.status);
    return { shouldBlock: false, error: true };
  }
}
