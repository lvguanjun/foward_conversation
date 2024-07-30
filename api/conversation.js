export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const moderationErrMsg =
    process.env.MODERATION_ERROR_MESSAGE ||
    "道德审核接口错误，请联系反馈或稍后再试。";
  const moderationBlockMsg =
    process.env.MODERATION_BLOCK_MESSAGE || "公益不易，请珍惜账号喵！";
  const maxMessages = process.env.MAX_MESSAGES || 1;
  const excessMsg = process.env.EXCESS_MESSAGE || moderationBlockMsg;

  if (pathname === "/backend-api/conversation") {
    // 预处理逻辑
    const requestBody = await request.clone().json();
    const messages = requestBody.messages;
    if (messages.length > maxMessages) {
      console.log("Excess messages:", messages.length);
      return new Response(
        JSON.stringify({
          detail: excessMsg,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userMessages = requestBody.messages
      .filter(
        (msg) =>
          msg.author.role === "user" &&
          (msg.content.content_type === "text" ||
            (msg.content.content_type === "multimodal_text" &&
              msg.content.parts.some((part) => typeof part === "string")))
      )
      .map((msg) =>
        msg.content.parts
          .filter((part) => typeof part === "string") // 只提取字符串部分
          .join("\n")
      );

    if (userMessages.length > 0) {
      const moderationResult = await checkContentForModeration(
        userMessages,
        openaiApiKey
      );
      if (moderationResult.error) {
        return new Response(
          JSON.stringify({
            detail: moderationErrMsg,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (moderationResult.shouldBlock) {
        return new Response(JSON.stringify({ detail: moderationBlockMsg }), {
          status: 451,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // 如果审核通过或不是 conversation 请求，转发请求
  return forwardRequest(request);
}

async function forwardRequest(req) {
  const url = new URL(req.url);
  url.host = "new.oaifree.com";
  url.protocol = "https:";

  // 创建新的 headers，并设置 host
  const newHeaders = new Headers(req.headers);
  newHeaders.set("Host", "new.oaifree.com");

  // 创建新的请求对象
  const newRequest = new Request(url, {
    method: req.method,
    headers: newHeaders,
    body: req.body,
    redirect: "manual", // 禁用自动重定向跟随
  });

  // 发送请求并获取响应
  return fetch(newRequest);
}

async function checkContentForModeration(messages, apiKey) {
  const OPENAI_BASE_URL =
    process.env.OPENAI_BASE_URL || "https://api.openai.com";
  const moderationUrl = OPENAI_BASE_URL + "/v1/moderations";
  const response = await fetch(moderationUrl, {
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
      error: false,
    };
  } else {
    console.error("Moderation API returned an error:", response.status);
    return { shouldBlock: false, error: true };
  }
}
