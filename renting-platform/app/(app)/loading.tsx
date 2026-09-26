import { PageContainer } from "@/components/layout/app-shell";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer>
      <PageSkeleton />
    </PageContainer>
  );
}
