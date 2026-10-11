import { PageSkeleton } from "@/components/PageSkeleton";

// Внутри layout админки: меню остаётся на месте, заготовка — только на
// месте раздела.
export default function Loading() {
  return <PageSkeleton title={false} />;
}
