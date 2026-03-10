"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Map, Shield, Users, Key, LogOut } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { clearAdminToken } from "@/lib/admin-token";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { label: "Map", href: "/", icon: Map },
  { label: "Geofences", href: "/geofence", icon: Shield },
  { label: "Users", href: "/users", icon: Users },
  { label: "API Keys", href: "/api-keys", icon: Key },
];

const CUSTOMER_NAV = [
  { label: "API Keys", href: "/api-keys", icon: Key },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const role = (session?.user as { role?: string } | undefined)?.role ?? "customer";
  const nav = role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;

  const handleLogout = async () => {
    clearAdminToken();
    await signOut();
    router.push("/auth");
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <span className="text-sm font-semibold tracking-tight">PeopleContext</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname === href}>
                    <Link href={href}>
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {session?.user && (
          <div className="flex items-center gap-2 px-1 min-w-0">
            {/* Avatar */}
            <div className="shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary select-none">
              {session.user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate leading-tight">
                {session.user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {session.user.email}
              </p>
            </div>
            {/* Role badge */}
            <span
              className={cn(
                "shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium",
                role === "admin"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {role}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
