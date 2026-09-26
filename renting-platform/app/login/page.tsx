import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/layout/brand-mark";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect("/dashboard");
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const demo = process.env.DEMO_MODE === "true";
  const company = await prisma.company.findFirst({ select: { name: true, tagline: true } });
  const demoUsers = demo
    ? await prisma.user.findMany({ where: { active: true, role: { not: "CLIENT" } }, select: { name: true, email: true, role: true, title: true }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(10_132_255/0.16),transparent)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-12 rounded-2xl [&_svg]:size-7" />
          <h1 className="mt-5 text-h2 text-fg">{company?.name ?? "ChurchTech Rent"}</h1>
          <p className="mt-1.5 text-[0.9375rem] text-fg-2">{company?.tagline ?? "Sistemas audiovisuais para igrejas, em renting."}</p>
        </div>
        <LoginForm next={next} demoUsers={demoUsers} />
      </div>
    </main>
  );
}
