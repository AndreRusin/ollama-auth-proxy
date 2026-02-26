require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(express.json());

// 🔐 Middleware проверки Bearer токена
function validateApiToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid Authorization format. Use Bearer <token>' });
    }

    const token = parts[1];

    if (token !== process.env.API_TOKEN) {
        return res.status(403).json({ error: 'Invalid API token' });
    }

    next();
}

// 🔁 Прокси на локальный Ollama
const ollamaProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
});

// 📌 Все запросы к /api проходят через проверку токена
app.use('/api', validateApiToken, ollamaProxy);

const PORT = 3021;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});