"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useRef } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { ROLE_LABELS, type RoleName } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";

interface DemoUser {
  name: string;
  email: string;
  role: RoleName;
  title: string | null;
}

const DEMO_PASSWORD = "demo1234";

export function LoginForm({ next, demoUsers }: { next?: string; demoUsers: DemoUser[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function quickLogin(email: string) {
    if (!emailRef.current || !passwordRef.current) return;
    emailRef.current.value = email;
    passwordRef.current.value = DEMO_PASSWORD;
    formRef.current?.requestSubmit();
  }

  return (
    <div className="glass edge rounded-panel p-6 sm:p-8">
      <form ref={formRef} action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input ref={emailRef} id="email" name="email" type="email" autoComplete="email" required placeholder="nome@empresa.pt" />
        </div>
        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input ref={passwordRef} id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && (
          <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-small text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={pending} rightIcon={<ArrowRight className="size-4" />}>
          Entrar
        </Button>
      </form>

      {demoUsers.length > 0 && (
        <div className="mt-7">
          <div className="mb-3 flex items-center gap-3">
            <span className="hairline flex-1" />
            <span className="eyebrow">Acesso demo</span>
            <span className="hairline flex-1" />
          </div>
          <ul className="space-y-1.5">
            {demoUsers.map((user) => (
              <li key={user.email}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => quickLogin(user.email)}
                  className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04]"
                >
                  <Avatar name={user.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-small font-medium text-fg">{user.name}</span>
                    <span className="block truncate text-micro text-fg-3">{user.email}</span>
                  </span>
                  <span className="text-micro text-fg-2">{ROLE_LABELS[user.role]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-micro text-fg-3">Palavra-passe de todas as contas demo: {DEMO_PASSWORD}</p>
        </div>
      )}
    </div>
  );
}
