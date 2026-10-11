"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Показатели нагрузки — на странице админки «Система» (/admin/system).
 * Данные — GET /api/admin/metrics через rewrite сайта (та же cookie
 * сессии); backend отвечает 403 не-администратору.
 *
 * Опрос — раз в 5 секунд и только пока страница открыта и видна: раньше
 * плавающее окно опрашивало backend с любой страницы сайта, нагружая
 * бесплатные Render и Supabase без нужды.
 */

type Metrics = {
  collected_at: string;
  requests: {
    window_seconds: number;
    total_since_start: number;
    in_flight: number;
    requests_last_minute: number;
    requests_in_window: number;
    errors_in_window: number;
    client_errors_in_window: number;
    avg_ms: number | null;
    p95_ms: number | null;
    max_ms: number | null;
  };
  process: {
    pid: number;
    uptime_seconds: number;
    cpu_percent: number | null;
    cpu_count: number;
    memory_rss_bytes: number | null;
    memory_is_peak: boolean;
    load_average: number[] | null;
    threads: number;
    asyncio_tasks: number;
    event_loop_lag_ms: number;
    python_version: string;
    platform: string;
  };
  database: {
    backend: string;
    ping_ms: number;
    pool_size: number;
    idle_connections: number;
    database_size_bytes: number | null;
    connections: number | null;
    active_web_sessions: number;
    notifications_pending: number;
    notifications_failed: number;
  };
  background_tasks: { name: string; running: boolean }[];
  online_users: number;
  open_tickets: number;
  pending_payments: number;
};

type Health = "ok" | "warn" | "bad";

const POLL_INTERVAL_MS = 5_000;

function health(metrics: Metrics | null, failed: boolean): Health {
  if (failed || !metrics) return "bad";
  const { requests, process, database, background_tasks } = metrics;
  if (background_tasks.some((task) => !task.running)) return "bad";
  if (
    (process.cpu_percent ?? 0) > 80 ||
    (requests.p95_ms ?? 0) > 1000 ||
    requests.errors_in_window > 0 ||
    database.ping_ms > 100 ||
    process.event_loop_lag_ms > 100 ||
    database.notifications_failed > 0
  ) {
    return "warn";
  }
  return "ok";
}

const HEALTH_COLOR: Record<Health, string> = {
  ok: "#16a34a",
  warn: "#d97706",
  bad: "#dc2626",
};

function bytes(value: number | null): string {
  if (value === null) return "—";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function duration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} д ${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  return `${minutes} мин ${seconds % 60} с`;
}

function ms(value: number | null): string {
  return value === null ? "—" : `${value < 10 ? value.toFixed(1) : Math.round(value)} мс`;
}

export function SystemMetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/metrics", { cache: "no-store" });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const data = (await response.json()) as Metrics;
      setMetrics(data);
      setFailed(false);
      setHistory((previous) => [...previous.slice(-29), data.requests.requests_last_minute]);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        await load();
      }
      if (!cancelled) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    tick();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const state = health(metrics, failed);
  const color = HEALTH_COLOR[state];

  return (
    <div className="flex flex-col gap-2">
        <section
          aria-label="Нагрузка на сервер"
          className="rounded-[24px] glass-medium p-5 text-sm"
        >
          <header className="mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-heading font-bold">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              Нагрузка
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {failed
                ? "нет данных от API"
                : metrics
                  ? `обновлено ${new Date(metrics.collected_at).toLocaleTimeString("ru-RU")}`
                  : "загрузка…"}
            </span>
          </header>

          {metrics && (
            <div className="grid gap-4 md:grid-cols-2">
              <Group title="HTTP-запросы к API">
                <Row label="За минуту" value={String(metrics.requests.requests_last_minute)} />
                <Sparkline values={history} color={color} />
                <Row label="Сейчас в обработке" value={String(metrics.requests.in_flight)} />
                <Row
                  label={`Время ответа (за ${metrics.requests.window_seconds / 60} мин)`}
                  value={`ср. ${ms(metrics.requests.avg_ms)} · p95 ${ms(metrics.requests.p95_ms)}`}
                />
                <Row label="Максимум" value={ms(metrics.requests.max_ms)} />
                <Row
                  label="Ошибки 5xx / 4xx"
                  value={`${metrics.requests.errors_in_window} / ${metrics.requests.client_errors_in_window}`}
                  warn={metrics.requests.errors_in_window > 0}
                />
                <Row label="Всего с запуска" value={String(metrics.requests.total_since_start)} />
              </Group>

              <Group title="Процесс API">
                <Row
                  label="CPU"
                  value={
                    metrics.process.cpu_percent === null
                      ? "—"
                      : `${metrics.process.cpu_percent}% (ядер: ${metrics.process.cpu_count})`
                  }
                  warn={(metrics.process.cpu_percent ?? 0) > 80}
                />
                <Row
                  label={metrics.process.memory_is_peak ? "Память (пик)" : "Память"}
                  value={bytes(metrics.process.memory_rss_bytes)}
                />
                {metrics.process.load_average && (
                  <Row label="Load average" value={metrics.process.load_average.join(" · ")} />
                )}
                <Row
                  label="Задержка event loop"
                  value={ms(metrics.process.event_loop_lag_ms)}
                  warn={metrics.process.event_loop_lag_ms > 100}
                />
                <Row
                  label="Потоки / задачи asyncio"
                  value={`${metrics.process.threads} / ${metrics.process.asyncio_tasks}`}
                />
                <Row label="Аптайм" value={duration(metrics.process.uptime_seconds)} />
              </Group>

              <Group title="База данных">
                <Row
                  label="Пинг"
                  value={ms(metrics.database.ping_ms)}
                  warn={metrics.database.ping_ms > 100}
                />
                <Row
                  label="Пул соединений API"
                  value={`${metrics.database.pool_size - metrics.database.idle_connections} занято из ${metrics.database.pool_size}`}
                />
                <Row label="Соединений с БД всего" value={String(metrics.database.connections ?? "—")} />
                <Row label="Размер БД" value={bytes(metrics.database.database_size_bytes)} />
                <Row label="Активных сессий сайта" value={String(metrics.database.active_web_sessions)} />
              </Group>

              <Group title="Студия и очереди">
                <Row label="Онлайн в боте (5 мин)" value={String(metrics.online_users)} />
                <Row
                  label="Открытых обращений"
                  value={String(metrics.open_tickets)}
                  warn={metrics.open_tickets > 0}
                />
                <Row label="Ожидают оплаты" value={String(metrics.pending_payments)} />
                <Row
                  label="Уведомления: в очереди / сбой"
                  value={`${metrics.database.notifications_pending} / ${metrics.database.notifications_failed}`}
                  warn={metrics.database.notifications_failed > 0}
                />
                {metrics.background_tasks.map((task) => (
                  <Row
                    key={task.name}
                    label={task.name}
                    value={task.running ? "работает" : "остановлена"}
                    warn={!task.running}
                  />
                ))}
              </Group>

              <p className="text-xs text-[var(--text-secondary)]">
                Python {metrics.process.python_version} · {metrics.process.platform} · PID{" "}
                {metrics.process.pid}
              </p>
            </div>
          )}

        </section>

    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={`text-right font-medium tabular-nums ${warn ? "text-[var(--danger)]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 300;
  const height = 32;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => `${(index * step).toFixed(1)},${(height - (value / max) * (height - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full"
      role="img"
      aria-label="Запросов в минуту за последние опросы"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
