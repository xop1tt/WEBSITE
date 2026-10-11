import { PageSkeleton } from "@/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <PageSkeleton />
    </div>
  );
}
