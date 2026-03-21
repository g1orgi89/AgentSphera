# АгентСфера

CRM-система для страховых агентов.

## Стек

- **Фронтенд:** React 18 (Vite)
- **Бэкенд:** Express.js
- **БД:** MongoDB 7 + Mongoose
- **Авторизация:** JWT
- **Деплой:** nginx + PM2

## Структура

```
agentsfera/
├── client/          # React приложение
├── server/          # Express API
└── docs/            # Документация и прототип
    ├── MASTER.md        # Полная спецификация
    ├── STEP-BY-STEP.md  # План разработки
    ├── AI-CONTEXT.md    # Текущий статус
    ├── ROADMAP.md       # Высокоуровневый план
    └── index.html       # Прототип UI
```

## Запуск

### Сервер

```bash
cd server
npm install
npm start
```

### Клиент

```bash
cd client
npm install
npm run dev
```

## Бренд

VP страхование. Цвета: `#01575C`, `#3CA8A8`, `#FEC400`, `#ECE3E4`.
