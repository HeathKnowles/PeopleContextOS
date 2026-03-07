"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MapSearchProvider } from "@/components/map-search-context";
import { FloatingSearch } from "@/components/floating-search";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <MapSearchProvider>
            <SidebarProvider>
                <AppSidebar />
                <main className="relative flex-1 overflow-hidden">
                    {/* Sidebar toggle — sits left of the floating search bar */}
                    <SidebarTrigger className="absolute top-3 left-3 z-1000" />
                    {/* Floating search overlay — positioned to the right of the trigger */}
                    <FloatingSearch />
                    {children}
                </main>
            </SidebarProvider>
        </MapSearchProvider>
    );
}