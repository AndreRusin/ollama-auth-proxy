require('dotenv').config();
const express = require('express');
const { Readable } = require("stream");
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Middleware для сохранения body
app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `request-${timestamp}.json`;
            const filePath = path.join(__dirname, 'logs', filename);
            
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                ip: req.ip
            };
            
            // Создаем директорию если её нет
            await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });
            
            // Сохраняем в файл
            await fs.writeFile(filePath, JSON.stringify(logData, null, 2));
            
            console.log(`Body сохранен в: ${filename}`);
        } catch (error) {
            console.error('Ошибка при сохранении body:', error);
        }
    }
    next();
});

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

app.post("/api/generate", validateApiToken, async (req, res) => {
  console.log("/api/generate")
  const reqBody = req.body;

  try {
    const response = await fetch("http://host.docker.internal:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });
    const resBody = (await response.json());

    res.json(resBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.post("/api/chat", validateApiToken, async (req, res) => {
  console.log("/api/chat")
  try {
    const response = await fetch("http://host.docker.internal:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    // прокидываем статус и заголовки
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // ВАЖНО: передаём поток напрямую
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.post("/api/embed", validateApiToken, async (req, res) => {
  const reqBody = req.body;

  try {
    const response = await fetch("http://host.docker.internal:11434/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });
    const resBody = (await response.json());

    res.json(resBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

app.get("/api/tags", validateApiToken, async (req, res) => {
  try {
    const response = await fetch("http://host.docker.internal:11434/api/tags", {
        headers: {
          "Content-Type": "application/json",
        },
      });
    const resBody = (await response.json());

    res.json(resBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});
app.get("/", async (req, res) => {
  try {
    const response = await fetch("http://host.docker.internal:11434/", {
        headers: {
          "Content-Type": "application/json",
        },
      });
    const resBody = (await response.text());

    res.send(resBody);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

const PORT = 3021;
app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
