import { LoginForm } from "../../../app/login/login-form";
import { BrandMark } from "@/components/layout/brand-mark";
import { useDemoState } from "../data/store";

export function LoginPage() {
  const state = useDemoState();
  const demoUsers = Object.values(state.users)
    .filter((u) => u.active && u.role !== "CLIENT")
    .map((u) => ({ name: u.name, email: u.email, role: u.role, title: u.title }));

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(10_132_255/0.16),transparent)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-12 rounded-2xl [&_svg]:size-7" />
          <h1 className="mt-5 text-h2 text-fg">{state.company.name}</h1>
          <p className="mt-1.5 text-[0.9375rem] text-fg-2">{state.company.tagline ?? "Sistemas audiovisuais para igrejas, em renting."}</p>
        </div>
        <LoginForm demoUsers={demoUsers} />
        <p className="mt-5 text-center text-micro text-fg-3">
          Versão de demonstração. Escolha um perfil acima; cada perfil vê apenas o que a sua função permite.
        </p>
      </div>
    </main>
  );
}
