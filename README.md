# 💃 Mirada Studio — сайт студии фламенко

Публичный сайт и личный кабинет студии: расписание, запись на занятия,
абонементы, оплата, обращения в поддержку и админка для сотрудников.
Сайт — только «витрина»: данные, правила записи, вход и права проверяет
backend (бот + веб-API), а сайт показывает то, что тот вернул.

**Живая версия:** <https://mirada-flamenco.netlify.app>

![Главная страница](docs/screenshots/website-home.png)

## Что умеет сайт

| Для посетителей | Для участников (после входа) | Для сотрудников |
|---|---|---|
| Главная, «О нас», направления | Личный кабинет и баланс занятий | Админка `/admin` |
| Расписание на ближайшие недели | Запись и отмена занятий, лист ожидания | Расписание, серии, запись за участника |
| Абонементы и цены | Покупка абонементов (ЮKassa) | Участники, платежи, балансы, отчёты |
| Преподаватели и контакты | Уведомления, обращения в поддержку | Рассылки, каталог, настройки, сотрудники |
| Светлая и тёмная тема | Вход по email или через Telegram-бота | Технические работы, состояние системы |

Подробно по страницам и сценариям — в [wiki](https://github.com/xop1tt/WEBSITE/wiki).

## Как это устроено

```text
браузер ──► сайт (Next.js, Netlify) ──HTTPS──► веб-API (FastAPI, Render) ──► PostgreSQL (Supabase)
                                                  ▲
                          Telegram-бот ───────────┘  (тот же backend и те же данные)
```

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS 4.
- Бизнес-логики на сайте нет — один источник правды (backend), поэтому сайт и
  Telegram-бот всегда показывают одно и то же.
- Дизайн — Liquid Glass, светлая и тёмная темы.

Система состоит из трёх репозиториев:

| Репозиторий | Что внутри |
|---|---|
| **WEBSITE** (этот) | сайт на Next.js |
| [TELEGRAM-BOT](https://github.com/xop1tt/TELEGRAM-BOT) | бот, веб-API и бизнес-логика |
| [DATABASE](https://github.com/xop1tt/DATABASE) | схема PostgreSQL и миграции |

## Быстрый старт

Нужен Node.js 20.9+ и запущенный backend (по умолчанию `http://127.0.0.1:8000`).

```bash
npm install
cp .env.example .env.local   # API_BASE_URL, NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
npm run dev                  # http://localhost:3000
```

Всё вместе (база, API, бот, сайт) поднимает `./start-mac.command` в общей
папке проекта. Без запущенного API сайт стартует и честно пишет «Сервис
временно недоступен», а не показывает пустые данные.

## Проверки перед коммитом

```bash
npx eslint src && npx tsc --noEmit && npm test && npm run build
```

## Документация

Подробная вики: <https://github.com/xop1tt/WEBSITE/wiki>

- [Страницы и возможности](https://github.com/xop1tt/WEBSITE/wiki/Страницы-и-возможности) · [Админка](https://github.com/xop1tt/WEBSITE/wiki/Админка)
- [Архитектура](https://github.com/xop1tt/WEBSITE/wiki/Архитектура) · [Вход и безопасность](https://github.com/xop1tt/WEBSITE/wiki/Вход-и-безопасность)
- [Дизайн](https://github.com/xop1tt/WEBSITE/wiki/Дизайн) · [Реклама](https://github.com/xop1tt/WEBSITE/wiki/Реклама)
- [Конфигурация](https://github.com/xop1tt/WEBSITE/wiki/Конфигурация) · [Развёртывание](https://github.com/xop1tt/WEBSITE/wiki/Развёртывание) · [Частые проблемы](https://github.com/xop1tt/WEBSITE/wiki/Частые-проблемы)

Правила дизайна — [`LIQUID_GLASS_DESIGN.md`](./LIQUID_GLASS_DESIGN.md), правила
разработки — [`CLAUDE.md`](./CLAUDE.md).

## Статус

Сайт работает на бесплатных тарифах (Netlify, Render, Supabase). Оплата на
сайте включается после подключения ЮKassa; контакты студии, преподаватели и
рекламные баннеры пока макеты — см. вики, «Известные ограничения».
