"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useMapSearch } from "@/components/map-search-context";

export default function MapComponent() {
    const { mapRef } = useMapSearch();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        let cancelled = false;

        import("leaflet").then((L) => {
            if (cancelled || !containerRef.current || mapRef.current) return;

            // Fix broken default marker icons in bundlers
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const map = L.map(containerRef.current!, {
                zoomControl: false, // added manually at bottomright below
            }).setView([22.5937, 78.9629], 5); // centred on India

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

            // Place zoom control away from the sidebar search area
            L.control.zoom({ position: "bottomright" }).addTo(map);

            mapRef.current = map;
        });

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // mapRef is a stable ref object — safe to omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Invalidate Leaflet's size whenever the container is resized
    // (handles sidebar collapse / window resize correctly)
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(() => {
            mapRef.current?.invalidateSize();
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [mapRef]);

    return <div ref={containerRef} className="h-full w-full" />;
}
