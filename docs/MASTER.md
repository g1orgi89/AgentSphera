# MASTER.md — АгентСфера v1.1

> Полная спецификация продакшен-версии. Единственный источник правды по архитектуре, API, схемам и бизнес-логике.

---

## 1. ОБЗОР ПРОЕКТА

**Продукт:** АгентСфера — CRM для страховых агентов
**Бренд:** VP страхование (логотип, цвета, шрифты — см. секцию Дизайн)
**Назначение:** управление клиентами, договорами, взносами, комиссиями, сверка актов от СК

### Стек

| Компонент | Технология |
|-----------|-----------|
| Бэкенд | Node.js 20+ / Express.js |
| База данных | MongoDB 7 / Mongoose |
| Фронтенд | React 18 (Vite) |
| Авторизация | JWT (access + refresh tokens) |
| AI-парсинг | Anthropic Claude API (@anthropic-ai/sdk) |
| Экспорт | exceljs (.xlsx) |
| CSS | CSS-переменные из брендбука VP |
| Деплой | VPS (Contabo), nginx reverse proxy |
| Репозиторий | GitHub: github.com/g1orgi89/AgentSphera (монорепо) |

### Структура монорепо

```
agentsfera/
├── server/
│   ├── src/
│   │   ├── models/          # Mongoose-схемы
│   │   ├── routes/          # Express-роуты
│   │   ├── middleware/       # auth, validation, error
│   │   ├── services/        # бизнес-логика
│   │   ├── utils/           # хелперы
│   │   └── app.js           # точка входа Express
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/      # переиспользуемые UI-компоненты
│   │   ├── pages/           # страницы (Dashboard, Clients, Contracts...)
│   │   ├── hooks/           # кастомные хуки
│   │   ├── services/        # API-вызовы
│   │   ├── store/           # состояние (Context или Zustand)
│   │   ├── styles/          # глобальные стили, брендбук
│   │   ├── utils/           # хелперы, форматирование
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── MASTER.md            # этот файл
│   ├── STEP-BY-STEP.md
│   ├── AI-CONTEXT.md
│   ├── CHAT-INSTRUCTION.md
│   ├── ROADMAP.md
│   └── prototype.html       # прототип
└── README.md
```

---

## 2. СХЕМЫ БАЗЫ ДАННЫХ

### User (пользователь / агент)

```javascript
{
  _id: ObjectId,
  name: String,           // required
  email: String,          // required, unique, lowercase
  password: String,       // bcrypt hash
  role: String,           // 'agent' | 'admin', default: 'agent'
  createdAt: Date,
  updatedAt: Date
}
```

### Client (клиент)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User — владелец записи
  name: String,           // required — ФИО или название
  phone: String,
  email: String,
  birthday: Date,         // null если неизвестна
  preferredContact: String, // 'Телефон' | 'Email' | 'Telegram' | 'WhatsApp' | 'СМС' | 'Звонок'
  status: String,         // 'active' | 'potential' | 'inactive', default: 'active'
  note: String,
  link: String,           // ссылка на документы (Google Drive и т.д.)
  createdAt: Date,
  updatedAt: Date
}
```
Индексы: `{ userId: 1, name: 1 }`, `{ userId: 1, status: 1 }`

### Contract (договор)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  clientId: ObjectId,     // ref: Client — required
  company: String,        // required — страховая компания (свободная форма)
  number: String,         // номер договора
  type: String,           // required — тип (свободная форма: КАСКО, ОСАГО, ДМС...)
  startDate: Date,
  endDate: Date,
  objectType: String,     // 'auto' | 'realty' | 'life'
  objectData: {
    // auto:
    car: String,
    plate: String,
    vin: String,
    // realty:
    realtyType: String,
    address: String,
    area: Number,
    // life:
    insured: String,
    age: Number,
    sumInsured: Number
  },
  premium: Number,        // required, >= 0
  commissionType: String, // '%' | 'fix'
  commissionValue: Number, // процент или фиксированная сумма
  installments: [{
    amount: Number,
    dueDate: Date,
    paid: Boolean,        // default: false
    paidDate: Date        // null если не оплачен
  }],
  note: String,
  link: String,           // ссылка на документы договора
  createdAt: Date,
  updatedAt: Date
}
```
Индексы: `{ userId: 1, clientId: 1 }`, `{ userId: 1, endDate: 1 }`, `{ userId: 1, company: 1 }`

Виртуальное поле `commissionAmount`:
```javascript
commissionType === '%' ? Math.round(premium * commissionValue / 100) : commissionValue
```

Виртуальное поле `status`:
```javascript
daysUntilEnd < 0 → 'expired'
daysUntilEnd <= 7 → 'expiring_7'
daysUntilEnd <= 14 → 'expiring_14'
daysUntilEnd <= 30 → 'expiring_30'
else → 'active'
```

### Task (задача)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  clientId: ObjectId,     // ref: Client — опционально
  title: String,          // required
  dueDate: Date,
  priority: String,       // 'h' | 'm' | 'l', default: 'm'
  done: Boolean,          // default: false
  createdAt: Date,
  updatedAt: Date
}
```
Индексы: `{ userId: 1, done: 1, dueDate: 1 }`

### Note (заметка / история взаимодействий)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  clientId: ObjectId,     // ref: Client — required
  text: String,           // required
  date: Date,             // default: now
  createdAt: Date
}
```
Индексы: `{ userId: 1, clientId: 1, date: -1 }`

### Act (акт сверки)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  company: String,        // СК
  period: String,         // свободная форма: "Янв 2025", "Q1 2025"
  date: Date,             // дата загрузки
  source: String,         // 'excel' | 'pdf' | 'csv' | 'manual'
  originalFileName: String, // имя загруженного файла (если source !== 'manual')
  items: [{
    contractNumber: String,
    clientName: String,
    expectedAmount: Number,  // рассчитанная КВ из базы
    actualAmount: Number,    // фактическая из акта
    status: String           // 'ok' | 'diff' | 'unknown'
  }],
  createdAt: Date
}
```
Индексы: `{ userId: 1, date: -1 }`

---

## 3. API ЭНДПОИНТЫ

Базовый URL: `/api/v1`
Все эндпоинты кроме auth требуют заголовок: `Authorization: Bearer <token>`
Ответы: `{ success: true, data: ... }` или `{ success: false, error: '...' }`

### Auth

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /auth/register | Регистрация (name, email, password) → token |
| POST | /auth/login | Вход (email, password) → token |
| GET | /auth/me | Текущий пользователь по токену |

### Clients

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /clients | Список (query: search, status, sort, page, limit) |
| GET | /clients/:id | Карточка клиента |
| POST | /clients | Создать |
| PUT | /clients/:id | Обновить |
| DELETE | /clients/:id | Удалить (каскад: договоры, задачи, заметки) |
| GET | /clients/:id/summary | Сводка: общая премия, КВ, кол-во договоров |

### Contracts

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /contracts | Список (query: search, company, type, objectType, status, actStatus, sort, page, limit) |
| GET | /contracts/:id | Детали |
| POST | /contracts | Создать |
| PUT | /contracts/:id | Обновить |
| DELETE | /contracts/:id | Удалить |
| PATCH | /contracts/:id/installments/:idx | Обновить статус взноса (paid: true/false) |
| GET | /contracts/totals | Итого: суммы, средний чек, подтверждённая КВ |

### Tasks

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /tasks | Список (query: filter=all|active|done, sort, page, limit) |
| POST | /tasks | Создать |
| PUT | /tasks/:id | Обновить |
| PATCH | /tasks/:id/toggle | Переключить done |
| DELETE | /tasks/:id | Удалить |

### Notes

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /clients/:id/notes | Заметки клиента (sort: date desc) |
| POST | /clients/:id/notes | Добавить заметку |
| DELETE | /notes/:id | Удалить заметку |

### Acts

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /acts | Список актов |
| POST | /acts | Создать (ручной ввод), автосверка при сохранении |
| POST | /acts/upload | Умный парсинг файла (Excel/PDF/CSV) через Claude AI + автосверка |
| DELETE | /acts/:id | Удалить |

#### Умный парсинг (POST /acts/upload)

Поток обработки:
1. Клиент отправляет файл (multipart/form-data) + поля `company`, `period`
2. Сервер принимает файл через `multer` (max 5MB, форматы: .xlsx, .xls, .csv, .pdf)
3. Извлечение текста/данных из файла:
   - Excel (.xlsx, .xls) → `exceljs` → текст всех ячеек
   - PDF (.pdf) → `pdf-parse` → текст страниц
   - CSV (.csv) → чтение как текст (utf-8)
4. Извлечённый контент отправляется в **Anthropic Claude API** с промптом:
   - Системный промпт: «Ты парсер актов сверки от страховых компаний. Из документа извлеки строки: номер договора, имя клиента, сумма комиссии. Верни ТОЛЬКО JSON-массив.»
   - Формат ответа: `[{ "contractNumber": "...", "clientName": "...", "amount": 0 }]`
5. Сервер парсит JSON-ответ Claude
6. Для каждой строки — сверка с базой (по номеру договора, case-insensitive)
7. Возвращает результат: `{ items: [...], source: 'excel'|'pdf'|'csv' }`

Ответ при ошибке парсинга Claude: `{ success: false, error: 'Не удалось распознать данные из файла' }`

### Dashboard

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /dashboard/stats | Метрики: сборы, КВ, клиенты, задолженность (query: period=all|month|quarter|year) |
| GET | /dashboard/alerts | Тревоги: просроченные взносы, истекающие договоры, взносы на неделе |
| GET | /dashboard/by-company | Сборы по СК |
| GET | /dashboard/by-type | Сборы по типам |
| GET | /dashboard/upcoming | Задачи + ДР на ближайший месяц |

### Export

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /export/xlsx | Экспорт всех договоров в Excel (.xlsx) |

---

## 4. СТРАНИЦЫ (ФРОНТЕНД)

### 4.1 Лендинг (`/`) → `Landing.jsx`
- Логотип VP + название АгентСфера
- Hero-блок: заголовок, описание, кнопки «Начать» / «Демо»
- Возможности (6 карточек)
- Футер

### 4.2 Авторизация (`/login`, `/register`) → `Login.jsx`, `Register.jsx`
- Логотип + форма (имя, email, пароль)
- Переключение вход/регистрация
- Валидация полей

### 4.3 Дашборд (`/dashboard`) → `Dashboard.jsx`
- Заголовок + быстрый поиск + фильтр периода
- Блок «Требует внимания» (сворачиваемые карточки):
  - Просроченные взносы (красный, сумма долга, детали по клику)
  - Истекающие договоры (30 дней, детали по клику)
  - Взносы на неделе (7 дней, детали по клику)
  - Задачи на сегодня
- 4 метрики: Сборы, Комиссия (ожидание + подтверждённая), Клиенты, Задолженность
- Аналитика (свёрнута по умолчанию): по СК, по типам
- Задачи и ДР на месяц

### 4.4 Клиенты (`/clients`) → `Clients.jsx`
- Список карточек с поиском
- Фильтры: тип, СК, объект
- Сортировка: имя, премия, КВ, кол-во договоров
- Статус клиента (активный/потенциальный/неактивный)
- Пустое состояние с CTA

### 4.5 Карточка клиента (`/clients/:id`) → `ClientDetail.jsx`
- Шапка: аватар, имя, контакты (tel:/mailto:), статус, ссылка на документы
- Сводка: общая премия, КВ, взносы, активные договоры
- Список договоров с статусами
- Заметки и история (добавление + список)
- Задачи клиента

### 4.6 Договоры (`/contracts`) → `Contracts.jsx`
- Таблица: клиент, СК, тип, номер, объект, даты, статус, премия, КВ ожид., КВ факт, взносы, сверка
- Сортировка по любой колонке
- Фильтры: СК, тип, объект, статус договора, статус сверки
- Строка «Итого»
- Клик → карточка клиента

### 4.7 Задачи (`/tasks`) → `Tasks.jsx`
- Список с фильтрами: все/активные/завершённые
- Создание/редактирование
- Выбор клиента через ClientPicker (поиск)
- Переключение статуса

### 4.8 Календарь (`/calendar`) → `Calendar.jsx`
- Месячный вид, навигация
- 4 типа событий: задачи, окончания, взносы, ДР
- Ромбовые маркеры
- Сводка по месяцу
- Детали дня по клику

### 4.9 Акты и сверка (`/acts`) → `Acts.jsx`
- Загрузка файла (drag&drop или кнопка). Форматы: Excel (.xlsx, .xls), PDF, CSV
- Поля при загрузке: СК (company), период (period)
- Индикатор обработки (AI парсит документ)
- Предпросмотр распознанных строк (до сохранения) — возможность редактировать
- Ручной ввод через форму (альтернатива загрузке)
- Автосверка с базой по номеру договора
- Статусы: совпадает / расхождение / не найден
- Кнопка «Сохранить» — сохраняет акт в базу
- Список сохранённых актов

---

## 5. БИЗНЕС-ЛОГИКА

### Статус договора (автоматически по датам)
```
daysUntilEnd < 0         → Истёк (красный)
daysUntilEnd <= 7        → Истекает через N дн. (красный)
daysUntilEnd <= 14       → Истекает через N дн. (жёлтый)
daysUntilEnd <= 30       → Истекает через N дн. (жёлтый)
else                     → Действующий (зелёный)
```

### Статус взноса
```
paid === true            → Оплачен (зелёный)
dueDate < today && !paid → Просрочен, N дн. (красный)
dueDate <= today+7       → Скоро (жёлтый)
else                     → Ожидание (серый)
```

### Сверка акта с базой
При загрузке акта (файл или ручной ввод):
1. **Если файл** — извлечь текст (Excel/PDF/CSV), отправить в Claude API, получить JSON-массив строк
2. **Если ручной ввод** — данные уже структурированы
3. Для каждой строки ищем договор по номеру (case-insensitive)
4. Если найден — сравниваем `actualAmount` с `commissionAmount`
5. Разница < 1₽ → `ok`, иначе → `diff`
6. Не найден → `unknown`

### Комиссия
```
commissionType === '%'  → Math.round(premium * commissionValue / 100)
commissionType === 'fix' → commissionValue
```

### Проверка дубликатов клиентов
При создании — поиск по `name` (case-insensitive, trim). Если найден → предупреждение (не блокировка).

### Каскадное удаление
Удаление клиента → удаление всех его договоров, задач, заметок.

---

## 6. ДИЗАЙН-СИСТЕМА

### Брендбук VP

**Цвета:**
| Переменная | Цвет | Использование |
|-----------|------|--------------|
| --pri | #01575C | Основной (сайдбар, кнопки, акценты) |
| --sec | #3CA8A8 | Вторичный (бирюзовый, теги, ховеры) |
| --acc | #FEC400 | Акцент (жёлтый, прогресс, CTA) |
| --bg | #ECE3E4 | Фон страницы |
| --card | #FFFFFF | Фон карточек |

**Шрифты:**
- Заголовки: Tenor Sans (serif)
- Основной текст: Lato (sans-serif)

**Логотип:** SVG — два пересекающихся ромба (#01575C + #3CA8A8), жёлтый акцент (#FEC400), буквы V и P

**Элементы:** ромбовые маркеры, ромбовые разделители, точки-ромбики в календаре

**Иконки:** SVG, без эмодзи

---

## 7. ВАЛИДАЦИЯ

### Клиент
- name: required, trim, 2-200 символов
- email: формат email если указан
- phone: допустимый формат если указан
- status: enum ['active', 'potential', 'inactive']

### Договор
- clientId: required, существующий клиент
- company: required, trim, 1-200 символов
- type: required, trim, 1-100 символов
- premium: required, >= 0
- commissionValue: >= 0
- endDate >= startDate (если обе указаны)
- installments: max 4, amount >= 0

### Задача
- title: required, trim, 2-500 символов
- priority: enum ['h', 'm', 'l']

### Акт
- company: required (при загрузке файла и ручном вводе)
- При загрузке файла: max 5MB, допустимые форматы: .xlsx, .xls, .csv, .pdf
- При ручном вводе: items min 1 элемент, каждый item: contractNumber или clientName обязателен

---

## 8. БЕЗОПАСНОСТЬ

- Пароли: bcrypt, min 6 символов
- JWT: access token (15 мин), refresh token (7 дней)
- Refresh token: хранить в httpOnly cookie (не в localStorage — уязвим к XSS)
- Все данные привязаны к userId — агент видит только свои данные
- Rate limiting: 100 req/min на auth, 1000 req/min общий
- CORS: только клиентский домен
- Helmet.js для HTTP-заголовков
- Input sanitization: mongo-sanitize
- Загрузка файлов: max 5MB, только .xlsx/.xls/.csv/.pdf (multer)
- API-ключ Anthropic: хранится в .env на сервере (ANTHROPIC_API_KEY), никогда не передаётся на клиент

### Бэкапы
- Ежедневный mongodump → сжатие → копия на внешнее хранилище
- Хранить последние 30 дней
- Скрипт восстановления (mongorestore) — проверить до продакшена

### Мягкое удаление
- Клиенты и договоры: поле `deletedAt` вместо физического удаления
- Удалённые записи не показываются в API по умолчанию
- Возможность восстановления в течение 30 дней
- Физическое удаление — по cron через 30 дней

---

## 9. ДЕПЛОЙ

```
VPS (Contabo) — Ubuntu 22.04
├── nginx (reverse proxy, SSL)
├── Node.js (PM2)
├── MongoDB (local или Atlas)
└── Certbot (Let's Encrypt SSL)
```

Домен: agentsfera.ru (или выбрать)
API: api.agentsfera.ru
Клиент: agentsfera.ru

---

*Версия: 1.1 | Дата: 22.03.2026*
