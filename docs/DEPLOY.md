# DEPLOY — АгентСфера

> Пошаговая инструкция деплоя. Сервер: Ubuntu на VPS.
> IP: 153.80.251.117
> Домен: агентсфера.рф (xn--80aaggblede0btep1n0e.xn--p1ai)

---

## 0. DNS (на reg.ru — сделай ДО начала)

Зайди в reg.ru → Домены → агентсфера.рф → DNS:

```
Тип: A    Хост: @    Значение: 153.80.251.117
Тип: A    Хост: www  Значение: 153.80.251.117
```

Дождись распространения (15-60 минут). Проверить: `ping xn--80aaggblede0btep1n0e.xn--p1ai`

---

## 1. Подключись к серверу

```bash
ssh root@153.80.251.117
```

---

## 2. Обнови систему

```bash
apt update && apt upgrade -y
```

---

## 3. Установи Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

---

## 4. Установи MongoDB 7

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
systemctl status mongod
```

Если ОС Ubuntu 24 (noble), замени `jammy` на `noble` в команде выше. Проверь версию:
```bash
cat /etc/os-release | grep VERSION_ID
```

---

## 5. Установи PM2 и nginx

```bash
npm install -g pm2
apt install -y nginx
systemctl enable nginx
```

---

## 6. Клонируй репозиторий

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/g1orgi89/AgentSphera.git agentsfera
cd agentsfera
```

---

## 7. Установи зависимости и собери клиент

```bash
# Сервер
cd /var/www/agentsfera/server
npm install

# Клиент
cd /var/www/agentsfera/client
npm install
npm run build
```

После сборки появится папка `client/dist/` — это статика.

---

## 8. Создай .env для сервера

```bash
cd /var/www/agentsfera/server
nano .env
```

Вставь (замени значения):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/agentsfera
JWT_SECRET=СГЕНЕРИРУЙ_ДЛИННЫЙ_СЛУЧАЙНЫЙ_КЛЮЧ
JWT_EXPIRE=15m
CLIENT_URL=https://xn--80aaggblede0btep1n0e.xn--p1ai
ANTHROPIC_API_KEY=sk-ant-твой_ключ_если_есть
```

Сгенерировать JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Сохрани: Ctrl+O, Enter, Ctrl+X

---

## 9. Запусти сервер через PM2

```bash
cd /var/www/agentsfera/server
pm2 start src/app.js --name agentsfera-api
pm2 save
pm2 startup
```

Проверь:
```bash
pm2 status
curl http://localhost:5000/api/v1/auth/me
```
Должен вернуть `{"success":false,"error":...}` — значит работает.

---

## 10. Настрой nginx

```bash
nano /etc/nginx/sites-available/agentsfera
```

Вставь:

```nginx
server {
    listen 80;
    server_name xn--80aaggblede0btep1n0e.xn--p1ai www.xn--80aaggblede0btep1n0e.xn--p1ai;

    # Статика клиента
    root /var/www/agentsfera/client/dist;
    index index.html;

    # API — проксируем на Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }

    # SPA: все остальные запросы → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кеширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Service worker — без кеша
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

Сохрани, затем:

```bash
ln -s /etc/nginx/sites-available/agentsfera /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## 11. Проверь HTTP

Открой в браузере: `http://xn--80aaggblede0btep1n0e.xn--p1ai`

Или по IP: `http://153.80.251.117`

Должен загрузиться лендинг.

---

## 12. Установи SSL (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx

certbot --nginx -d xn--80aaggblede0btep1n0e.xn--p1ai -d www.xn--80aaggblede0btep1n0e.xn--p1ai
```

Certbot спросит email (для напоминаний) и согласие.
Он автоматически добавит SSL в nginx конфиг и настроит редирект HTTP → HTTPS.

Проверь автопродление:
```bash
certbot renew --dry-run
```

---

## 13. Готово!

Открой: `https://агентсфера.рф`

---

## Полезные команды

```bash
# Статус сервера
pm2 status
pm2 logs agentsfera-api

# Перезапуск после изменений
cd /var/www/agentsfera
git pull
cd client && npm run build
pm2 restart agentsfera-api

# Логи nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Статус MongoDB
systemctl status mongod

# Бэкап MongoDB
mongodump --db agentsfera --gzip --archive=/root/backups/agentsfera-$(date +%Y%m%d).gz
```

---

## Обновление приложения

```bash
cd /var/www/agentsfera
git pull origin main
cd server && npm install
cd ../client && npm install && npm run build
pm2 restart agentsfera-api
```

---

## Фаервол (рекомендуется)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

*Дата: 23.03.2026*
