import { createContext, useContext } from "react";
import { Outlet } from "react-router-dom";

import { AppPageError, AppPageLoading } from "@/components/app-page-state";
import { AppShell } from "@/components/app-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { User } from "@/lib/api";

const AppUserContext = createContext<User | null>(null);

export function useAppUser() {
  const user = useContext(AppUserContext);
  if (!user) throw new Error("useAppUser must be used inside AppLayout");
  return user;
}

export function AppLayout() {
  const userQuery = useCurrentUser();

  if (userQuery.isPending) return <AppPageLoading />;
  if (userQuery.isError) {
    return <AppPageError onRetry={() => void userQuery.refetch()} />;
  }

  return (
    <AppUserContext.Provider value={userQuery.data}>
      <AppShell user={userQuery.data}>
        <Outlet />
      </AppShell>
    </AppUserContext.Provider>
  );
}
