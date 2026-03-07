"use client";

import dynamic from "next/dynamic";

// Leaflet requires browser APIs — disable SSR
const Map = dynamic(() => import("@/components/map"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Loading map…
        </div>
    ),
});

export default function Home() {
    return (
        <div className="h-screen w-full overflow-hidden">
            <Map />
        </div>
    );
}
