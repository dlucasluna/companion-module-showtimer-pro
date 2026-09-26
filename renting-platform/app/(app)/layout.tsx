import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { PresentationProvider } from "@/components/layout/presentation-context";
import { SessionProvider } from "@/components/layout/session-context";
import { requireSession } from "@/lib/auth/session";
import { PRESENTATION_COOKIE } from "@/store/presentation-store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();
  const presenting = (await cookies()).get(PRESENTATION_COOKIE)?.value === "1";

  return (
    <SessionProvider
      session={{
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        title: session.title,
        companyName: session.companyName,
        permissions: session.permissions,
      }}
    >
      <PresentationProvider initial={presenting}>
        <AppShell>{children}</AppShell>
      </PresentationProvider>
    </SessionProvider>
  );
}
