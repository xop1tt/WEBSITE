import { cookies } from "next/headers";
import { API_BASE_URL, SESSION_COOKIE_NAME } from "@/lib/backend";

/**
 * Скачивание выгрузки CSV из админки: браузер получает файл с этого
 * адреса, а сервер сайта пересылает запрос backend с cookie сессии. Права
 * проверяет backend (только администратор).
 */
const KINDS = new Set(["payments", "bookings", "clients"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
): Promise<Response> {
  const { kind } = await params;
  if (!KINDS.has(kind)) {
    return new Response("Not found", { status: 404 });
  }
  const session = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const search = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const name of ["from", "to"]) {
    const value = search.get(name);
    if (value) query.set(name, value);
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/admin/export/${kind}.csv?${query.toString()}`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
      cache: "no-store",
    });
  } catch {
    return new Response("Сервис временно недоступен", { status: 503 });
  }
  if (!response.ok) {
    return new Response(await response.text(), { status: response.status });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ?? `attachment; filename="${kind}.csv"`,
    },
  });
}
