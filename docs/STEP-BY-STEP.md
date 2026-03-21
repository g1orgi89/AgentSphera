# STEP-BY-STEP — АгентСфера

> План разработки. 7 фаз, ~45 задач. Каждая задача — конкретные файлы и чеклист.
> Стек: React 18 (Vite) + Express.js + MongoDB 7 + Mongoose + JWT

---

## Фаза 0 — Инфраструктура

### 0.1 Создать монорепо
- [ ] GitHub repo `agentsfera`
- [ ] Структура: `server/`, `client/`, `docs/`
- [ ] `.gitignore` (node_modules, .env, dist)
- [ ] `README.md` с описанием проекта
- [ ] Загрузить docs/ (MASTER, STEP-BY-STEP, AI-CONTEXT, CHAT-INSTRUCTION, ROADMAP, prototype.html)

### 0.2 Настроить сервер
- [ ] `server/package.json` (express, mongoose, cors, helmet, bcryptjs, jsonwebtoken, dotenv, morgan, express-rate-limit, express-mongo-sanitize)
- [ ] `server/.env.example` (PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRE, CLIENT_URL)
- [ ] `server/src/app.js` — Express каркас (middleware, роуты-заглушки, обработка ошибок)
- [ ] Проверить: `npm start` → сервер слушает порт

### 0.3 Настроить клиент
- [ ] `npm create vite@latest client -- --template react`
- [ ] Очистить шаблон (удалить лишнее)
- [ ] Установить: `react-router-dom`
- [ ] `client/src/App.jsx` — роутер с пустыми страницами
- [ ] Подключить шрифты (Tenor Sans, Lato) через Google Fonts
- [ ] CSS-переменные из брендбука (см. MASTER.md секция 6)
- [ ] Проверить: `npm run dev` → пустая страница с правильными шрифтами

### 0.4 Подключить MongoDB
- [ ] Установить MongoDB локально или настроить Atlas
- [ ] `server/src/config/db.js` — подключение через Mongoose
- [ ] Проверить: лог «MongoDB connected» при старте

---

## Фаза 1 — Авторизация

### 1.1 Модель User
- Файлы: `server/src/models/User.js`
- Секция MASTER.md: 2 (User schema)
- [ ] Mongoose-схема с валидацией
- [ ] Pre-save хук: bcrypt хеширование пароля
- [ ] Метод: `comparePassword(plain)`
- [ ] Метод: `generateToken()` → JWT

### 1.2 Роуты авторизации
- Файлы: `server/src/routes/auth.js`, `server/src/middleware/auth.js`
- Секция MASTER.md: 3 (Auth API), 8 (Безопасность)
- [ ] POST /auth/register — валидация, создание, токен
- [ ] POST /auth/login — проверка email/password, access token + refresh в httpOnly cookie
- [ ] GET /auth/me — по токену вернуть пользователя
- [ ] Middleware `protect` — проверка JWT, добавление req.user
- [ ] Rate limiting на auth роуты (100 req/min)

### 1.3 Экраны входа (фронтенд)
- Файлы: `client/src/pages/Login.jsx`, `client/src/pages/Register.jsx`, `client/src/services/api.js`, `client/src/store/AuthContext.jsx`
- Секция MASTER.md: 4.2
- [ ] AuthContext: хранение токена, user, login(), register(), logout()
- [ ] api.js: axios instance с interceptor для токена
- [ ] Форма входа (email, пароль)
- [ ] Форма регистрации (имя, email, пароль)
- [ ] Редирект в /dashboard после входа
- [ ] Protected route wrapper

### 1.4 Лендинг
- Файлы: `client/src/pages/Landing.jsx`
- Секция MASTER.md: 4.1
- [ ] Hero, возможности, футер
- [ ] Кнопки → /login, /register
- [ ] Брендбук: логотип SVG, цвета, шрифты, ромбы

---

## Фаза 2 — Клиенты и базовый CRUD

### 2.1 Модель Client
- Файлы: `server/src/models/Client.js`
- Секция MASTER.md: 2 (Client schema)
- [ ] Mongoose-схема с валидацией
- [ ] Индексы

### 2.2 API клиентов
- Файлы: `server/src/routes/clients.js`, `server/src/services/clientService.js`
- Секция MASTER.md: 3 (Clients API)
- [ ] GET /clients — поиск, фильтр по статусу, сортировка, пагинация
- [ ] GET /clients/:id
- [ ] POST /clients — с проверкой дубликатов (предупреждение, не блокировка)
- [ ] PUT /clients/:id
- [ ] DELETE /clients/:id — каскадное удаление

### 2.3 Страница клиентов (фронтенд)
- Файлы: `client/src/pages/Clients.jsx`, `client/src/components/ClientCard.jsx`, `client/src/components/ClientForm.jsx`, `client/src/components/ClientPicker.jsx`
- Секция MASTER.md: 4.4
- [ ] Список с поиском и фильтрами
- [ ] Сортировка (имя, премия, КВ, кол-во)
- [ ] Статус клиента (активный/потенциальный/неактивный)
- [ ] Пустое состояние с CTA
- [ ] ClientPicker — компонент поиска клиента (для форм)

### 2.4 Карточка клиента (фронтенд)
- Файлы: `client/src/pages/ClientDetail.jsx`
- Секция MASTER.md: 4.5
- [ ] Шапка с контактами (tel:, mailto:)
- [ ] Сводка (премия, КВ, взносы, активные)
- [ ] Ссылка на документы (всегда видна, кнопка «Добавить/Изменить»)
- [ ] Список договоров (пока пустой — заполнится в фазе 3)
- [ ] Модальные формы: создание, редактирование, удаление

### 2.5 Модель Note + API
- Файлы: `server/src/models/Note.js`, `server/src/routes/notes.js`
- Секция MASTER.md: 2 (Note), 3 (Notes API)
- [ ] GET /clients/:id/notes
- [ ] POST /clients/:id/notes
- [ ] DELETE /notes/:id

### 2.6 Заметки в карточке клиента
- Файлы: обновить `client/src/pages/ClientDetail.jsx`
- [ ] Поле ввода + кнопка «Добавить»
- [ ] Список заметок с датами
- [ ] Удаление заметки

---

## Фаза 3 — Договоры

### 3.1 Модель Contract
- Файлы: `server/src/models/Contract.js`
- Секция MASTER.md: 2 (Contract schema), 5 (бизнес-логика)
- [ ] Mongoose-схема с валидацией
- [ ] Виртуальные поля: commissionAmount, status
- [ ] Индексы

### 3.2 API договоров
- Файлы: `server/src/routes/contracts.js`, `server/src/services/contractService.js`
- Секция MASTER.md: 3 (Contracts API)
- [ ] GET /contracts — поиск, фильтры (СК, тип, объект, статус, сверка), сортировка, пагинация
- [ ] GET /contracts/:id
- [ ] POST /contracts — валидация (endDate >= startDate, max 4 взносов)
- [ ] PUT /contracts/:id
- [ ] DELETE /contracts/:id
- [ ] PATCH /contracts/:id/installments/:idx
- [ ] GET /contracts/totals

### 3.3 Форма договора (фронтенд)
- Файлы: `client/src/components/ContractForm.jsx`
- Секция MASTER.md: 4.5 (карточка), 4.6 (таблица)
- [ ] 3 шага: договор+взносы → объект → сводка
- [ ] СК и тип — Combo (поиск + свободный ввод)
- [ ] Объект: авто/недвижимость/жизнь — разные поля
- [ ] До 4 взносов с датами и статусами
- [ ] Комиссия: % или фикс
- [ ] Ссылка на документы
- [ ] Выбор клиента через ClientPicker (если из страницы договоров)
- [ ] Кнопка «Новый клиент» прямо из формы

### 3.4 Договоры в карточке клиента
- Файлы: обновить `client/src/pages/ClientDetail.jsx`
- [ ] Список договоров со статусами
- [ ] Статус договора (действующий/истекает/истёк)
- [ ] Взносы: оплачен/просрочен/скоро/ожидание — переключение по клику
- [ ] Кнопки: добавить, редактировать, удалить

### 3.5 Страница договоров
- Файлы: `client/src/pages/Contracts.jsx`
- Секция MASTER.md: 4.6
- [ ] Таблица с сортировкой по колонкам
- [ ] Фильтры: СК, тип, объект, статус, сверка
- [ ] Строка «Итого»
- [ ] Клик → карточка клиента

---

## Фаза 4 — Задачи, Календарь, Экспорт

### 4.1 Модель Task + API
- Файлы: `server/src/models/Task.js`, `server/src/routes/tasks.js`
- Секция MASTER.md: 2 (Task), 3 (Tasks API)
- [ ] CRUD + toggle
- [ ] Фильтры: all/active/done

### 4.2 Страница задач
- Файлы: `client/src/pages/Tasks.jsx`, `client/src/components/TaskForm.jsx`
- Секция MASTER.md: 4.7
- [ ] Список с фильтрами
- [ ] ClientPicker для привязки
- [ ] Приоритеты

### 4.3 Задачи в карточке клиента
- Файлы: обновить `client/src/pages/ClientDetail.jsx`
- [ ] Список задач клиента
- [ ] Добавление, переключение, удаление

### 4.4 Календарь
- Файлы: `client/src/pages/Calendar.jsx`
- Секция MASTER.md: 4.8
- [ ] Месячный вид
- [ ] 4 типа событий (задачи, окончания, взносы, ДР)
- [ ] Ромбовые маркеры
- [ ] Сводка месяца
- [ ] Детали дня

### 4.5 Экспорт CSV
- Файлы: `server/src/routes/export.js`
- Секция MASTER.md: 3 (Export API)
- [ ] GET /export/csv → файл с BOM для Excel
- [ ] Кнопка на странице клиентов и договоров

---

## Фаза 5 — Акты, Дашборд

### 5.1 Модель Act + API
- Файлы: `server/src/models/Act.js`, `server/src/routes/acts.js`, `server/src/services/actService.js`
- Секция MASTER.md: 2 (Act), 3 (Acts API), 5 (сверка)
- [ ] POST /acts — ручной ввод, автосверка при сохранении
- [ ] POST /acts/upload — парсинг Excel (xlsx на сервере)
- [ ] GET /acts
- [ ] DELETE /acts/:id

### 5.2 Страница актов
- Файлы: `client/src/pages/Acts.jsx`
- Секция MASTER.md: 4.9
- [ ] Загрузка Excel
- [ ] Ручной ввод
- [ ] Таблица результатов
- [ ] Статусы: совпадает/расхождение/не найден
- [ ] Список сохранённых актов

### 5.3 Dashboard API
- Файлы: `server/src/routes/dashboard.js`, `server/src/services/dashboardService.js`
- Секция MASTER.md: 3 (Dashboard API)
- [ ] GET /dashboard/stats — с фильтром по периоду
- [ ] GET /dashboard/alerts
- [ ] GET /dashboard/by-company
- [ ] GET /dashboard/by-type
- [ ] GET /dashboard/upcoming

### 5.4 Страница дашборда
- Файлы: `client/src/pages/Dashboard.jsx`
- Секция MASTER.md: 4.3
- [ ] Быстрый поиск + фильтр периода
- [ ] Блок тревог (сворачиваемый, кликабельный)
- [ ] 4 метрики
- [ ] Аналитика (свёрнута)
- [ ] Задачи и ДР

---

## Фаза 6 — Финализация

### 6.1 Сайдбар и навигация
- Файлы: `client/src/components/Sidebar.jsx`, `client/src/components/Layout.jsx`
- [ ] SVG-логотип VP
- [ ] 6 пунктов: дашборд, клиенты, договоры, задачи, календарь, акты
- [ ] Имя пользователя + аватар
- [ ] Сворачивание сайдбара
- [ ] Кнопка «Выйти»

### 6.2 UI-компоненты
- Файлы: `client/src/components/ui/` (Tag, Card, Button, Modal, Toast, Separator, Combo, ClientPicker, Label, EmptyState)
- [ ] Все переиспользуемые компоненты из прототипа
- [ ] Стили по брендбуку

### 6.3 Валидация и обработка ошибок
- [ ] Клиент: валидация форм перед отправкой
- [ ] Сервер: express-validator или Joi
- [ ] Глобальный error handler
- [ ] Toast для уведомлений (успех/ошибка)
- [ ] 404 страница
- [ ] Загрузка файлов: max 5MB, только xlsx/xls/csv (multer)

### 6.4 Мягкое удаление и бэкапы
- Файлы: обновить модели Client, Contract — добавить `deletedAt`
- [ ] Мягкое удаление: поле deletedAt вместо физического удаления
- [ ] API фильтрует deletedAt по умолчанию
- [ ] Скрипт бэкапа: `server/scripts/backup.sh` (mongodump + gzip)
- [ ] Cron на сервере: ежедневный бэкап

### 6.5 Тестирование (минимальное)
- Файлы: `server/tests/auth.test.js`, `server/tests/contracts.test.js`
- [ ] Тест авторизации: регистрация → логин → доступ → невалидный токен
- [ ] Тест CRUD клиентов: создание → чтение → обновление → удаление
- [ ] Тест договоров: создание с взносами → подсчёт КВ → статус
- [ ] Тест сверки акта: загрузка → сопоставление → статусы ok/diff/unknown
- [ ] Тест каскадного удаления: удалить клиента → договоры и задачи удалены

### 6.6 Деплой
- [ ] VPS: установить Node.js, MongoDB, nginx
- [ ] PM2 для Node.js
- [ ] Nginx: reverse proxy (API + статика)
- [ ] SSL (Certbot)
- [ ] .env на сервере
- [ ] CI: автодеплой из main (опционально)

### 6.7 Приёмка
- [ ] Пройти все страницы
- [ ] Проверить мобильную адаптивность (базовую)
- [ ] Проверить все CRUD операции
- [ ] Проверить сверку актов
- [ ] Проверить авторизацию (регистрация, вход, выход, защита роутов)
- [ ] Нагрузочный тест: 1000 договоров

---

*Версия: 1.0 | Задач: ~40 | Дата: 21.03.2026*
