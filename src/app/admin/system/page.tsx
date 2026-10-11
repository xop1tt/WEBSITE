import type { Metadata } from "next";
import { SystemMetricsPanel } from "@/components/admin/SystemMetricsPanel";

export const metadata: Metadata = {
  title: "Система",
};

export default function AdminSystemPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Нагрузка на API и базу. Данные обновляются раз в 5 секунд, пока эта
        страница открыта.
      </p>
      <SystemMetricsPanel />
    </div>
  );
}
