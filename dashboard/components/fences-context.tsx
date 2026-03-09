"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import type { GeoFence } from "@/lib/types";
import { listFences, deleteFence as apDeleteFence } from "@/lib/fences-api";

interface FencesContextType {
    fences: GeoFence[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    addFence: (fence: GeoFence) => void;
    removeFence: (id: string) => void;
}

const FencesContext = createContext<FencesContextType | null>(null);

export function FencesProvider({ children }: { children: React.ReactNode }) {
    const [fences, setFences] = useState<GeoFence[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listFences();
            setFences(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load geofences.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Load once on mount
    useEffect(() => { refresh(); }, [refresh]);

    const addFence = useCallback((fence: GeoFence) => {
        setFences((prev) => [fence, ...prev]);
    }, []);

    const removeFence = useCallback((id: string) => {
        setFences((prev) => prev.filter((f) => f.id !== id));
        apDeleteFence(id).catch(() => {
            // On failure, re-fetch to restore correct state
            refresh();
        });
    }, [refresh]);

    return (
        <FencesContext.Provider
            value={{ fences, loading, error, refresh, addFence, removeFence }}
        >
            {children}
        </FencesContext.Provider>
    );
}

export function useFences() {
    const ctx = useContext(FencesContext);
    if (!ctx) throw new Error("useFences must be used within a FencesProvider");
    return ctx;
}
