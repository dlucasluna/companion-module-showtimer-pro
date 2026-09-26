import type { LoginState } from "../../../lib/actions/auth";
import { current, setCurrentUser } from "../data/store";
import { useRouterStore } from "../router";

export type { LoginState };

/** Demo sign-in: switches the active profile (Admin, Comercial, Leitura…). */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = Object.values(current().users).find((u) => u.email === email && u.active);
  if (!user || password !== "demo1234") return { error: "Email ou palavra-passe incorretos." };
  setCurrentUser(user.email);
  useRouterStore.getState().replace(user.role === "TECHNICIAN" ? "/assets" : "/dashboard");
  return {};
}

export async function logoutAction(): Promise<void> {
  useRouterStore.getState().replace("/login");
}
