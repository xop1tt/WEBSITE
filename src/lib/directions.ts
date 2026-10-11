/**
 * Направления занятий для сайта.
 *
 * Название, описание и уровень приходят с backend (`GET /api/classes`,
 * источник истины — таблица `class_formats`, которую меняет администратор в
 * «Каталоге»; её же показывает бот), поэтому на сайте и в боте текст
 * одинаковый. Скрытые направления и скрытые на сайте (SITE_HIDDEN_CLASS_KEYS) сюда не попадают.
 */

import { getClasses, SITE_HIDDEN_CLASS_KEYS } from "./api";

export type Direction = {
  key: string;
  label: string;
  description: string;
  level: string;
};

// При недоступном API — пустой список: направления лишь подписи и фильтры,
// а саму ошибку страница показывает по результату расписания.
export async function getDirections(): Promise<Direction[]> {
  const result = await getClasses();
  if (!result.ok) {
    return [];
  }
  return result.data
    .filter((item) => !SITE_HIDDEN_CLASS_KEYS.has(item.key))
    .map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
      level: item.level,
    }));
}
