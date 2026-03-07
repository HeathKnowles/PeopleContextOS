"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MapSearchProvider } from "@/components/map-search-context";
import { FloatingSearch } from "@/components/floating-search";
import { AddFenceSheet } from "@/components/add-fence-sheet";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isMapPage = pathname === "/";

    return (
        <MapSearchProvider>
            <SidebarProvider>
                <AppSidebar />
                <main className="relative flex-1 overflow-hidden">
                    <SidebarTrigger className="absolute top-3 left-3 z-1000" />
                    {/* Floating search only shown on the map page */}
                    {isMapPage && <FloatingSearch />}
                    {children}
                </main>
                {/* Sheet is always mounted so it can open from any page */}
                <AddFenceSheet />
            </SidebarProvider>
        </MapSearchProvider>
    );
}