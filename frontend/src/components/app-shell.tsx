import {
  Bell,
  BookOpen,
  Bookmark,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Home,
  LibraryBig,
  LogOut,
  Search,
  Settings,
  ShoppingCart,
  UserRound,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User } from "@/lib/api";
import { clearCredentials } from "@/lib/storage";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  isFeature?: boolean;
};

const primaryNavigation: NavigationItem[] = [
  { label: "Home", icon: Home, href: "/app/home" },
  { label: "My Courses", icon: BookOpen },
  { label: "Live Classes", icon: Video },
  { label: "Quizzes", icon: ClipboardCheck },
  { label: "Practice", icon: LibraryBig },
  { label: "Bookmarks", icon: Bookmark },
  { label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { label: "StudyCircle", icon: UsersRound, href: "/app", isFeature: true },
  { label: "Store", icon: ShoppingCart },
  { label: "Profile", icon: UserRound },
  { label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  function signOut() {
    clearCredentials();
    queryClient.clear();
    navigate("/");
  }

  return (
    <SidebarProvider
      className="pt-16"
      style={{ "--sidebar-width": "13.5rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 border-b border-border bg-white">
        <div className="flex h-full min-w-0 flex-1 items-center border-r border-border px-3 md:w-[13.5rem] md:flex-none md:px-4">
          <Link to="/app" className="flex min-w-0 items-center gap-2.5" aria-label="Shikho home">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-dark-blue)] text-sm font-black text-white">
              শি
            </span>
            <span className="text-xl font-black tracking-[-0.05em] text-[var(--brand-pink)]">
              shikho
            </span>
          </Link>
          <SidebarTrigger className="ml-auto md:hidden" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 md:px-5">
          <div className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search Shikho"
              className="h-9 bg-white pl-9 shadow-none"
              placeholder="Search lessons, quizzes, topics..."
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-[var(--brand-pink)]" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 gap-2 px-2">
                  <Avatar className="size-8 border border-border">
                    <AvatarFallback className="bg-[var(--brand-dark-blue)] text-xs font-bold text-white">
                      {initials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block max-w-32 truncate text-sm font-semibold">{user.display_name}</span>
                    <span className="block text-[11px] text-muted-foreground">Class 10</span>
                  </span>
                  <ChevronDown className="hidden size-3.5 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Sidebar
        collapsible={isMobile ? "offcanvas" : "none"}
        className="sticky top-16 hidden h-[calc(100svh-4rem)] w-[13.5rem] shrink-0 border-r border-sidebar-border md:flex"
      >

        <SidebarContent>
          <SidebarGroup className="px-2.5 py-3">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {primaryNavigation.map((item) => {
                  const active = item.isFeature
                    ? location.pathname.includes("study-circle") || location.pathname === "/app"
                    : item.href === location.pathname;
                  const content = (
                    <>
                      <item.icon />
                      <span>{item.label}</span>
                    </>
                  );

                  return (
                    <SidebarMenuItem key={item.label}>
                      {item.href ? (
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="h-10 px-3 data-[active=true]:bg-[var(--brand-dark-blue)] data-[active=true]:text-white"
                        >
                          <Link to={item.href}>{content}</Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton tooltip={item.label} aria-disabled="true" className="h-10 px-3">
                          {content}
                        </SidebarMenuButton>
                      )}
                      {item.isFeature ? (
                        <SidebarMenuBadge className="right-2.5 bg-[var(--brand-pink)] text-[10px] font-bold text-white">
                          NEW
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Help & Support">
                <CircleHelp />
                <span>Help & Support</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="!w-0 min-h-[calc(100svh-4rem)] min-w-0 flex-1 overflow-x-hidden bg-[#f7f8fc]">
        <div className="min-w-0 p-3 sm:p-4 lg:p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function CohortBadge() {
  return (
    <Badge variant="secondary" className="border border-[#ccd7ef] bg-[#eef3ff] text-[var(--brand-dark-blue)]">
      Current Class 10 Mathematics cohort
    </Badge>
  );
}
