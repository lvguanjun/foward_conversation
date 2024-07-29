export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (pathname === "/backend-api/conversation") {
    // 预处理逻辑
    const requestBody = await request.clone().json();
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
        return new Response(
          JSON.stringify({ detail: "道德审核接口错误，请联系反馈或稍后再试。" }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (moderationResult.shouldBlock) {
        return new Response(
          JSON.stringify({ detail: "公益不易，请珍惜账号喵！" }),
          {
            status: 451,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  // 如果审核通过或不是 conversation 请求，转发请求
  return forwardRequest(request);
}

async function forwardRequest(req) {
  const baseUrl = "https://new.oaifree.com";

  const originalUrl = new URL(req.url);
  const path = originalUrl.pathname + originalUrl.search;

  const targetUrl = new URL(path, baseUrl);

  const requestInit = {
    method: req.method,
    headers: new Headers(req.headers),
    body: req.body,
  };

  requestInit.headers.set("host", new URL(baseUrl).host);

  const response = await fetch(targetUrl.toString(), requestInit);

  const { readable, writable } = new TransformStream();
  response.body.pipeTo(writable);

  return new Response(readable, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
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
      error: false,
    };
  } else {
    console.error("Moderation API returned an error:", response.status);
    return { shouldBlock: false, error: true };
  }
}
