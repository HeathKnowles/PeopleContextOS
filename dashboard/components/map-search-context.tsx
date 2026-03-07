"use client";

import { createContext, useCallback, useContext, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

interface MapSearchContextType {
    mapRef: React.RefObject<LeafletMap | null>;
    markerRef: React.RefObject<Marker | null>;
    flyToLocation: (lat: number, lon: number, displayName: string) => Promise<void>;
}

const MapSearchContext = createContext<MapSearchContextType | null>(null);

export function MapSearchProvider({ children }: { children: React.ReactNode }) {
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<Marker | null>(null);

    const flyToLocation = useCallback(
        async (lat: number, lon: number, displayName: string) => {
            if (!mapRef.current) return;
            const L = await import("leaflet");
            const latlng: [number, number] = [lat, lon];

            mapRef.current.flyTo(latlng, 13, { duration: 1.5 });

            if (markerRef.current) {
                markerRef.current.setLatLng(latlng);
                markerRef.current.setPopupContent(displayName);
                markerRef.current.openPopup();
            } else {
                markerRef.current = L.marker(latlng)
                    .addTo(mapRef.current)
                    .bindPopup(displayName, { maxWidth: 280 })
                    .openPopup();
            }
        },
        []
    );

    return (
        <MapSearchContext.Provider value={{ mapRef, markerRef, flyToLocation }}>
            {children}
        </MapSearchContext.Provider>
    );
}

export function useMapSearch() {
    const ctx = useContext(MapSearchContext);
    if (!ctx) throw new Error("useMapSearch must be used within a MapSearchProvider");
    return ctx;
}
