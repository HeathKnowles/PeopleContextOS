"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// Paths that require admin role — customers are redirected to /api-keys
const ADMIN_ONLY_PREFIXES = ["/", "/geofence", "/campaigns"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isPending) return;

        if (!session) {
            router.replace(`/auth?callbackUrl=${encodeURIComponent(pathname)}`);
            return;
        }

        const role = (session.user as { role?: string }).role ?? "customer";
        const isAdminOnly = ADMIN_ONLY_PREFIXES.some((prefix) =>
            prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)
        );

        if (role !== "admin" && isAdminOnly) {
            router.replace("/api-keys");
        }
    }, [session, isPending, pathname, router]);

    if (isPending) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!session) return null;

    // Synchronously block render while the useEffect redirect is about to fire.
    // Without this, children render for one frame before the redirect, causing
    // hooks like useMapSearch() to throw if they're called outside their provider.
    const role = (session.user as { role?: string }).role ?? "customer";
    const isAdminOnly = ADMIN_ONLY_PREFIXES.some((prefix) =>
        prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)
    );
    if (role !== "admin" && isAdminOnly) return null;

    return <>{children}</>;
}
