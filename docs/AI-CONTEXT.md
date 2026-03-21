# AI-CONTEXT — АгентСфера

> Обновляется после каждой сессии. Только статус и прогресс.
> Правила и роль — в CHAT-INSTRUCTION.md.

---

## ПРОЕКТ

**Что:** CRM для страховых агентов «АгентСфера» (клиенты, договоры, взносы, комиссии, сверка актов)
**Бренд:** VP страхование
**Стек:** React 18 (Vite) + Express.js + MongoDB 7 + Mongoose + JWT + nginx
**Репозиторий:** github.com/g1orgi89/AgentSphera (монорепо: `server/` + `client/` + `docs/`)
**Документы в репо:**
- `docs/MASTER.md` (v1.0) — полная спецификация
- `docs/STEP-BY-STEP.md` (v1.0) — ~40 задач, 7 фаз
- `docs/index.html` — рабочий прототип UI (920+ строк)
- `docs/ROADMAP.md` — высокоуровневый план

---

## ТЕКУЩИЙ СТАТУС

**Фаза:** 3 (договоры) — в процессе
**Последняя задача:** 3.2 (API договоров) — ГОТОВО
**Следующая задача:** 3.3 (Форма договора — фронтенд)
**Блокеры:** нет
**Тестирование:** API клиентов (2.2) протестировано вручную. Фронтенд (2.3, 2.4) протестирован в браузере. API договоров (3.2) — ожидает ручного тестирования.

---

## ПРОГРЕСС

**Готовые задачи:**
- [x] 0.1 — Монорепо: структура server/, client/, docs/, .gitignore, README.md
- [x] 0.2 — Сервер: package.json, .env.example, app.js каркас
- [x] 0.3 — Клиент: Vite+React, роутер, шрифты, CSS-переменные брендбука
- [x] 0.4 — MongoDB: config/db.js, connectDB()
- [x] 1.1 — Модель User: схема, bcrypt, JWT
- [x] 1.2 — Роуты авторизации: register, login, /me + middleware protect
- [x] 1.3 — Фронтенд авторизации: AuthContext, api.js, Login, Register, ProtectedRoute
- [x] 1.4 — Лендинг: hero, возможности, футер, SVG-логотип VP
- [x] 2.1 — Модель Client: схема, валидация, индексы
- [x] 2.2 — API клиентов: clientService.js + routes/clients.js (CRUD, поиск, фильтры, пагинация, дубликаты, каскад, сводка)
- [x] 2.3 — Страница клиентов: Clients.jsx, ClientCard.jsx, ClientForm.jsx, ClientPicker.jsx, Clients.css
- [x] 2.4 — Карточка клиента: ClientDetail.jsx + ClientDetail.css (шапка, сводка, документы, кнопки «+ Договор»/«+ Задача», ромбовые разделители)
- [x] 2.5 — Модель Note + API: Note.js, routes/notes.js (GET/POST /clients/:id/notes, DELETE /notes/:id), подключение в app.js
- [x] 2.6 — Заметки в карточке клиента: поле ввода + кнопка «Добавить» (Enter), список заметок с датами и ромб-маркерами, удаление заметки, реальные API-вызовы
- [x] 3.1 — Модель Contract: схема с installmentSchema, виртуальные поля commissionAmount и status, валидация endDate >= startDate, индексы
- [x] 3.2 — API договоров: contractService.js + routes/contracts.js (CRUD, поиск по номеру/СК/типу/клиенту, фильтры по status/company/type/objectType, PATCH взносов, totals), подключение в app.js

**Прототип:** завершён, согласован.

---

## ПРОШЛАЯ СЕССИЯ

_21.03.2026 — Задача 3.2 (API договоров). Создан contractService.js: getContracts (поиск по company/number/type/имени клиента, фильтры по objectType/status через даты, сортировка, пагинация, populate clientId), getContractById, createContract (проверка существования клиента), updateContract (whitelist полей, проверка clientId при смене), deleteContract, updateInstallment (PATCH взноса по индексу — paid/paidDate/amount/dueDate), getTotals (суммы с учётом фильтров). Создан routes/contracts.js: 7 эндпоинтов (GET /, GET /totals, GET /:id, POST /, PUT /:id, DELETE /:id, PATCH /:id/installments/:idx). Обновлён app.js: заглушка contracts заменена на реальный роутер. Фильтр по actStatus не реализован — зависит от модели Act (фаза 5). Далее: 3.3 (форма договора фронтенд)._

---

## РЕШЕНИЯ

| Дата | Решение | Причина |
|------|---------|---------|
| 21.03.2026 | MongoDB вместо PostgreSQL | Опыт разработчика + гибкая схема для объектов страхования |
| 21.03.2026 | React (Vite) для фронтенда | Опыт разработчика |
| 21.03.2026 | Монорепо | Проще управлять, один git clone |
| 21.03.2026 | CSS-переменные из брендбука VP | Согласовано с заказчиком |
| 21.03.2026 | Без эмодзи — SVG-иконки | Требование заказчика |
| 21.03.2026 | Каскадное удаление через mongoose.model() + try/catch | Модели могут ещё не существовать |
| 21.03.2026 | Два роутера для заметок (clientNotesRouter + notesRouter) | mergeParams для вложенных роутов /clients/:clientId/notes |
| 21.03.2026 | /contracts/totals до /:id в роутере | Иначе Express трактует "totals" как :id |
| 21.03.2026 | Фильтр status через date-запросы (не JS-фильтрация) | Виртуальные поля не индексируются, фильтрация через $gte/$lte на endDate эффективнее |
| 21.03.2026 | actStatus фильтр отложен до фазы 5 | Зависит от модели Act которая создаётся в 5.1 |

---

## ПРОБЛЕМЫ

| Проблема | Блокирует | Статус |
|----------|-----------|--------|
| Домен не выбран | Деплой (фаза 6) | Решить до фазы 6 |
| VPS не настроен | Деплой (фаза 6) | Решить до фазы 6 |

---

*Последнее обновление: 21.03.2026*
