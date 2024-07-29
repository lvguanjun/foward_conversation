import http from 'http';
import https from 'https';
import { parse } from 'url';

export default function handler(req, res) {
    const { pathname } = parse(req.url, true);
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', async () => {
        body = Buffer.concat(body).toString();

        if (pathname === '/backend-api/conversation') {
            // 预处理逻辑
            const requestBody = JSON.parse(body);
            const userMessages = requestBody.messages
                .filter(msg => msg.author.role === "user" && msg.content.content_type === "text")
                .map(msg => msg.content.parts.join(" "));

            if (userMessages.length > 0) {
                const moderationResult = await checkContentForModeration(userMessages, openaiApiKey);
                if (moderationResult.error) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: "道德审核接口错误，请稍后再试。" }));
                }
                if (moderationResult.shouldBlock) {
                    res.writeHead(451, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ detail: "公益不易，请珍惜账号喵！" }));
                }
            }
            // 如果审核通过，转发请求
            forwardRequest(req, res, body);
        } else {
            // 直接转发其他所有请求
            forwardRequest(req, res, body);
        }
    });
}

function forwardRequest(req, res, body = null) {
    const baseUrl = 'https://new.oaifree.com';
    const targetUrl = new URL(req.url, baseUrl);
    console.log(targetUrl.href);
    const lib = targetUrl.protocol.startsWith('https') ? https : http;

    req.headers.host = targetUrl.host;

    const requestOptions = {
        method: req.method,
        headers: req.headers,
        host: targetUrl.host,
        path: targetUrl.pathname + targetUrl.search,
        servername: targetUrl.hostname,
    };

    console.log(requestOptions);

    const proxy = lib.request(targetUrl, requestOptions, proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    if (body) {
        proxy.write(body);
    }
    req.pipe(proxy, { end: true });

    proxy.on('error', err => {
        console.error('Proxy error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'An error occurred during request forwarding.' }));
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
            shouldBlock: data.results.some(result => result.flagged),
            error: false
        };
    } else {
        console.error("Moderation API returned an error:", response.status);
        return { shouldBlock: false, error: true };
    }
}
