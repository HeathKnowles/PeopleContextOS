"use client";

import { useMemo, useState } from "react";
import type { GeoFence } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Search, Trash2, MapPin, Loader2, RefreshCw, AlertCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMapSearch } from "@/components/map-search-context";
import { useFences } from "@/components/fences-context";

function FenceCard({
    fence,
    onDelete,
}: {
    fence: GeoFence;
    onDelete: (id: string) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete geofence "${fence.name}"?`)) return;
        setDeleting(true);
        onDelete(fence.id);
    };

    return (
        <Card className="relative py-0 overflow-hidden">
            {/* Colour accent strip by category */}
            <div className="absolute left-0 inset-y-0 w-1 bg-primary/70 rounded-l-xl" />
            <CardHeader className="px-6 pt-5 pb-0 pl-7">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-base truncate">{fence.name}</CardTitle>
                        <CardDescription className="mt-0.5 capitalize">
                            {fence.category}
                            {fence.project_info && (
                                <span className="ml-2 text-muted-foreground/60">
                                    · {fence.project_info}
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Trash2 className="size-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pl-7 mt-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {fence.latitude.toFixed(5)}, {fence.longitude.toFixed(5)}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <svg
                            className="size-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <circle cx="12" cy="12" r="9" />
                            <circle cx="12" cy="12" r="1" fill="currentColor" />
                        </svg>
                        {fence.radius >= 1000
                            ? `${(fence.radius / 1000).toFixed(1)} km`
                            : `${fence.radius} m`}
                    </span>
                    <span className="ml-auto text-xs opacity-60">
                        {new Date(fence.created_at).toLocaleDateString()}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function GeofencePage() {
    const { setPendingPin } = useMapSearch();
    const { fences, loading, error, refresh, removeFence } = useFences();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return fences;
        const q = search.toLowerCase();
        return fences.filter(
            (f) =>
                f.name.toLowerCase().includes(q) ||
                f.category.toLowerCase().includes(q) ||
                f.project_info?.toLowerCase().includes(q) ||
                String(f.latitude).includes(q) ||
                String(f.longitude).includes(q)
        );
    }, [fences, search]);

    return (
        <div className="flex flex-col h-full w-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-xl font-semibold">Geofences</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {fences.length} fence{fences.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh"
                        >
                            <RefreshCw
                                className={cn("size-4", loading && "animate-spin")}
                            />
                        </Button>
                        <Button
                            onClick={() =>
                                setPendingPin({ lat: 0, lon: 0, displayName: "" })
                            }
                        >
                            <PlusCircle className="size-4" />
                            Add Geofence
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="search"
                        placeholder="Search by name, category, or project…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
                        <Loader2 className="size-5 animate-spin" />
                        <span className="text-sm">Loading geofences…</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-destructive">
                        <AlertCircle className="size-8" />
                        <p className="text-sm text-center">{error}</p>
                        <Button variant="outline" size="sm" onClick={refresh}>
                            Retry
                        </Button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                        <MapPin className="size-8 opacity-40" />
                        <p className="text-sm">
                            {search
                                ? "No geofences match your search."
                                : "No geofences yet. Click \"Add Geofence\" or search the map and click + to add one."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((fence) => (
                            <FenceCard
                                key={fence.id}
                                fence={fence}
                                onDelete={removeFence}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
