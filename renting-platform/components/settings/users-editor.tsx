"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { updateUserRoleAction } from "@/lib/actions/settings";
import { ROLE_LABELS, type RoleName } from "@/lib/auth/permissions";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  title: string | null;
  /** Pre-formatted on the server (relative times would differ between SSR and hydration). */
  lastLoginLabel: string;
}

export function UsersEditor({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <ul className="divide-y divide-white/[0.06]">
      {users.map((user) => (
        <li key={user.id} className="flex flex-wrap items-center gap-3 py-3">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-fg">
              {user.name}
              {user.id === currentUserId && <span className="text-small font-normal text-fg-3"> (você)</span>}
            </p>
            <p className="truncate text-small text-fg-3">
              {user.email} · último acesso {user.lastLoginLabel}
            </p>
          </div>
          <Select
            aria-label={`Função de ${user.name}`}
            className="w-48"
            defaultValue={user.role}
            disabled={pending || user.id === currentUserId}
            onChange={(e) =>
              startTransition(async () => {
                const result = await updateUserRoleAction(user.id, e.target.value as RoleName);
                if (result.ok) toast.success("Função atualizada.", user.name);
                else toast.error("Não foi possível alterar", result.error);
              })
            }
          >
            {(Object.keys(ROLE_LABELS) as RoleName[])
              .filter((role) => role !== "CLIENT")
              .map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
          </Select>
        </li>
      ))}
    </ul>
  );
}
