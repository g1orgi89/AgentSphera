# AI-CONTEXT — АгентСфера

> Обновляется после каждой сессии. Только статус и прогресс.
> Правила и роль — в CHAT-INSTRUCTION.md.

---

## ПРОЕКТ

**Что:** CRM для страховых агентов «АгентСфера» (клиенты, договоры, взносы, комиссии, сверка актов)
**Бренд:** VP страхование
**Стек:** React 18 (Vite) + Express.js + MongoDB 7 + Mongoose + JWT + nginx + Anthropic Claude API
**Репозиторий:** github.com/g1orgi89/AgentSphera (монорепо: `server/` + `client/` + `docs/`)
**Документы в репо:**
- `docs/MASTER.md` (v1.1) — полная спецификация
- `docs/STEP-BY-STEP.md` (v1.1) — ~40 задач, 7 фаз
- `docs/index.html` — рабочий прототип UI (920+ строк)
- `docs/ROADMAP.md` — высокоуровневый план

---

## ТЕКУЩИЙ СТАТУС

**Фаза:** 5 (акты, дашборд) — в процессе
**Последняя задача:** 5.3 (Dashboard API) — ГОТОВО
**Следующая задача:** 5.4 (Страница дашборда)
**Блокеры:** нет
**Тестирование:** 5.1 + 5.2 (Акты) — протестировано (Excel .xls + PDF загружаются, AI распознаёт). Fix: заменён exceljs на xlsx (SheetJS) для чтения .xls. 4.5 (Экспорт Excel) — протестирован, OK. 5.3 (Dashboard API) — ожидает тестирования после фронта (5.4).

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
- [x] 2.4 — Карточка клиента: ClientDetail.jsx + ClientDetail.css (шапка, сводка, документы, ромбовые разделители)
- [x] 2.5 — Модель Note + API: Note.js, routes/notes.js
- [x] 2.6 — Заметки в карточке клиента
- [x] 3.1 — Модель Contract: схема, виртуальные поля, валидация, индексы
- [x] 3.2 — API договоров: contractService.js + routes/contracts.js (7 эндпоинтов)
- [x] 3.3 — Форма договора: ContractForm.jsx + ContractForm.css (3 шага)
- [x] 3.4 — Договоры в карточке клиента: список, статусы, взносы, CRUD
- [x] 3.5 — Страница договоров: таблица, фильтры, сортировка, итого, пагинация
- [x] 4.1 — Модель Task + API: Task.js, taskService.js, routes/tasks.js (5 эндпоинтов)
- [x] 4.2 — Страница задач: Tasks.jsx + Tasks.css, TaskForm.jsx (fixedClient prop)
- [x] 4.3 — Задачи в карточке клиента: ClientDetail.jsx (fixedClient={client}), ClientDetail.css (cd-task-*)
- [x] 4.4 — Календарь: Calendar.jsx + Calendar.css (месячный вид, 4 типа событий, ромбовые маркеры, сводка, детали дня)
- [x] 4.5 — Экспорт Excel: export.js (GET /export/xlsx, exceljs, стилизация, итого, границы), кнопки на страницах
- [x] 5.1 — Модель Act + API + умный парсинг: Act.js, actService.js (extractText через xlsx/SheetJS для .xls+.xlsx, pdf-parse для PDF; parseWithClaude; reconcileItems), routes/acts.js. Пакеты: @anthropic-ai/sdk, multer, pdf-parse, xlsx
- [x] 5.2 — Страница актов: Acts.jsx + Acts.css. Два режима (загрузка файла + ручной ввод), предпросмотр, список сохранённых актов
- [x] 5.3 — Dashboard API: dashboardService.js (getStats с фильтром period all/month/quarter/year — премия, КВ, клиенты, задолженность; getAlerts — просроченные взносы с daysOverdue и суммой долга, взносы на неделе с daysUntil, истекающие договоры 30 дней, задачи на сегодня; getByCompany — премия+КВ+count по СК; getByType — премия+КВ+count по типам; getUpcoming — задачи на 30 дней + ДР клиентов с daysUntil), routes/dashboard.js (5 GET-эндпоинтов). Обновлён app.js — последняя заглушка dashboard заменена.

**Прототип:** завершён, согласован.
**Правка вне спеки:** ClientPicker — при фокусе показывает всех клиентов, фильтрация при вводе (по просьбе заказчика).

---

## ПРОШЛАЯ СЕССИЯ

_22.03.2026 — Задачи 4.5, 5.1, 5.2, 5.3. Задача 4.5: Экспорт Excel (export.js, кнопки, fix итого/границ/виртуальных полей). Задача 5.1: Act.js + actService.js + routes/acts.js — умный парсинг через Claude AI. Пакеты: @anthropic-ai/sdk, multer, pdf-parse, xlsx. Fix: заменён exceljs на xlsx (SheetJS) для чтения .xls файлов — exceljs не поддерживает старый бинарный формат. Задача 5.2: Acts.jsx + Acts.css — страница актов с drag&drop загрузкой, AI-парсингом, предпросмотром, ручным вводом, списком актов. Протестировано: Excel (.xls) и PDF загружаются и распознаются. Задача 5.3: dashboardService.js (5 функций: stats с period-фильтром, alerts с просроченными/предстоящими взносами и истекающими договорами, by-company, by-type, upcoming с задачами и ДР) + routes/dashboard.js (5 GET). Обновлён app.js — все заглушки заменены реальными роутами. Обновлены MASTER.md v1.1, STEP-BY-STEP.md v1.1. Далее: 5.4 (Страница дашборда)._

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
| 21.03.2026 | Фильтр status через date-запросы (не JS-фильтрация) | Виртуальные поля не индексируются |
| 21.03.2026 | actStatus фильтр отложен до фазы 5 | Зависит от модели Act |
| 21.03.2026 | ClientPicker: загрузка всех клиентов при монтировании | По просьбе заказчика — выпадающий список + поиск |
| 21.03.2026 | Задачи клиента: fetch всех + фильтр на клиенте | API не поддерживает фильтр по clientId, аналогично договорам |
| 21.03.2026 | Календарь: сборка событий из 3 API на клиенте | Нет отдельного calendar API, данные агрегируются на фронтенде |
| 22.03.2026 | Экспорт в Excel (.xlsx) вместо CSV | Согласовано с заказчиком. Пакет exceljs. Эндпоинт /export/xlsx вместо /export/csv |
| 22.03.2026 | Умный парсинг актов через Claude AI | Согласовано с заказчиком. Форматы: Excel (.xls + .xlsx), PDF, CSV. Пакеты: @anthropic-ai/sdk, multer, pdf-parse, xlsx (SheetJS) |
| 22.03.2026 | POST /acts/upload → предпросмотр без сохранения | Пользователь редактирует распознанные данные перед сохранением |
| 22.03.2026 | xlsx (SheetJS) вместо exceljs для чтения актов | exceljs не поддерживает .xls (BIFF). SheetJS читает оба формата. exceljs остался для экспорта |

---

## ПРОБЛЕМЫ

| Проблема | Блокирует | Статус |
|----------|-----------|--------|
| Домен не выбран | Деплой (фаза 6) | Решить до фазы 6 |
| VPS не настроен | Деплой (фаза 6) | Решить до фазы 6 |

---

*Последнее обновление: 22.03.2026*
