import type { Metadata } from "next";
import {
  getAdminClassFormats,
  getAdminPackages,
  type AdminClassFormat,
  type AdminLessonPackage,
} from "@/lib/admin";
import { classFormatAction, packageAction } from "@/lib/adminActions";
import { isServiceFailure } from "@/lib/apiResult";
import { formatPrice } from "@/lib/format";
import { GLASS_BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/lib/glass";
import { ServiceUnavailableNotice } from "@/components/ServiceUnavailableNotice";
import { Badge, EmptyState, Notices } from "@/components/admin/AdminUi";

export const metadata: Metadata = {
  title: "Каталог",
};

type SearchParams = Promise<{ notice?: string; error?: string }>;

const LABEL = "flex flex-col gap-1.5 text-sm font-medium";
const KEY_HINT = "латиница, цифры и _, например pack_12; потом не меняется";

export default async function AdminCatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const { notice, error } = await searchParams;
  const [formats, packages] = await Promise.all([getAdminClassFormats(), getAdminPackages()]);
  if (!formats.ok || !packages.ok) {
    const failed = !formats.ok ? formats : packages;
    return isServiceFailure(failed) ? <ServiceUnavailableNotice /> : <EmptyState>Нет доступа.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Notices notice={notice} error={error} />
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Изменения сразу видны на сайте и в боте (боту нужно до минуты).
        Ненужное направление или абонемент скройте — удалить нельзя, на них
        ссылаются прошлые занятия и покупки. Новые цена, состав и срок
        абонемента действуют для следующих покупок; уже купленные сохраняют
        свои условия.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Абонементы</h2>
        <ul className="flex flex-col gap-3">
          {packages.data.map((item) => (
            <PackageForm key={item.key} item={item} />
          ))}
          <PackageForm />
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold tracking-tight">Направления</h2>
        <ul className="flex flex-col gap-3">
          {formats.data.map((item) => (
            <FormatForm key={item.key} item={item} />
          ))}
          <FormatForm />
        </ul>
      </section>
    </div>
  );
}

function PackageForm({ item }: { item?: AdminLessonPackage }) {
  const create = item === undefined;
  return (
    <li className="rounded-[24px] glass-medium p-5">
      <details open={create ? false : undefined}>
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-2">
          {create ? (
            <span className="font-medium">+ Новый абонемент</span>
          ) : (
            <>
              <span className="font-medium">{item.title}</span>
              <span className="text-sm text-[var(--text-secondary)]">
                {formatPrice(item.price_rub)} ·{" "}
                {item.validity_days ? `${item.validity_days} дн.` : "бессрочно"}
              </span>
              {!item.is_active && <Badge>скрыт</Badge>}
            </>
          )}
        </summary>
        <form action={packageAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="create" value={create ? "1" : "0"} />
          <label className={`${LABEL} lg:col-span-2`}>
            Ключ
            <input
              name="key"
              required
              defaultValue={item?.key}
              readOnly={!create}
              pattern="[a-z][a-z0-9_]{1,31}"
              title={KEY_HINT}
              className={INPUT_CLASS}
            />
          </label>
          <label className={`${LABEL} lg:col-span-4`}>
            Название
            <input name="title" required maxLength={100} defaultValue={item?.title} className={INPUT_CLASS} />
          </label>
          <label className={LABEL}>
            Занятий
            <input type="number" name="lessons" min={1} max={100} required defaultValue={item?.lessons ?? 4} className={INPUT_CLASS} />
          </label>
          <label className={LABEL}>
            Цена, ₽
            <input type="number" name="price_rub" min={1} required defaultValue={item?.price_rub} className={INPUT_CLASS} />
          </label>
          <label className={LABEL}>
            Срок, дней
            <input
              type="number"
              name="validity_days"
              min={1}
              max={3650}
              placeholder="бессрочно"
              defaultValue={item?.validity_days ?? undefined}
              className={INPUT_CLASS}
            />
          </label>
          <label className={LABEL}>
            Порядок
            <input type="number" name="sort_order" defaultValue={item?.sort_order ?? 100} className={INPUT_CLASS} />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium lg:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked={item?.is_active ?? true} />
            Продаётся
          </label>
          <div className="sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className={`${create ? PRIMARY_BUTTON_CLASS : GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}
            >
              {create ? "Добавить абонемент" : "Сохранить"}
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}

function FormatForm({ item }: { item?: AdminClassFormat }) {
  const create = item === undefined;
  return (
    <li className="rounded-[24px] glass-medium p-5">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-2">
          {create ? (
            <span className="font-medium">+ Новое направление</span>
          ) : (
            <>
              <span className="font-medium">{item.title}</span>
              <span className="text-sm text-[var(--text-secondary)]">{item.level}</span>
              {!item.is_active && <Badge>скрыто</Badge>}
            </>
          )}
        </summary>
        <form action={classFormatAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="create" value={create ? "1" : "0"} />
          <label className={`${LABEL} lg:col-span-2`}>
            Ключ
            <input
              name="key"
              required
              defaultValue={item?.key}
              readOnly={!create}
              pattern="[a-z][a-z0-9_]{1,31}"
              title={KEY_HINT}
              className={INPUT_CLASS}
            />
          </label>
          <label className={`${LABEL} lg:col-span-2`}>
            Название
            <input name="title" required maxLength={100} defaultValue={item?.title} className={INPUT_CLASS} />
          </label>
          <label className={`${LABEL} lg:col-span-2`}>
            Коротко (для кнопок)
            <input name="short_title" required maxLength={32} defaultValue={item?.short_title} className={INPUT_CLASS} />
          </label>
          <label className={`${LABEL} sm:col-span-2 lg:col-span-6`}>
            Описание
            <textarea
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={item?.description}
              className={INPUT_CLASS}
            />
          </label>
          <label className={`${LABEL} lg:col-span-3`}>
            Уровень
            <input name="level" maxLength={100} defaultValue={item?.level} className={INPUT_CLASS} />
          </label>
          <label className={LABEL}>
            Порядок
            <input type="number" name="sort_order" defaultValue={item?.sort_order ?? 100} className={INPUT_CLASS} />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium lg:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked={item?.is_active ?? true} />
            Показывать
          </label>
          <div className="sm:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className={`${create ? PRIMARY_BUTTON_CLASS : GLASS_BUTTON_CLASS} px-4 py-2 text-sm`}
            >
              {create ? "Добавить направление" : "Сохранить"}
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}
