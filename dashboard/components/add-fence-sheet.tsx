"use client";

import { useEffect, useRef, useState } from "react";
import { useMapSearch } from "@/components/map-search-context";
import { useFences } from "@/components/fences-context";
import { createFence } from "@/lib/fences-api";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
}

const CATEGORIES = [
    "retail",
    "transport",
    "education",
    "health",
    "hospitality",
    "entertainment",
    "government",
    "residential",
    "industrial",
    "other",
];

export function AddFenceSheet() {
    const { pendingPin, setPendingPin } = useMapSearch();
    const { addFence } = useFences();

    // ── Form fields ──────────────────────────────────────────────────────────
    const [name, setName] = useState("");
    const [lat, setLat] = useState("");
    const [lon, setLon] = useState("");
    const [radius, setRadius] = useState("200");
    const [category, setCategory] = useState("other");
    const [projectInfo, setProjectInfo] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Inline location search state ─────────────────────────────────────────
    const [locQuery, setLocQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [searching, setSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Sync fields when pendingPin is set from the map
    useEffect(() => {
        if (pendingPin) {
            setName(pendingPin.displayName.split(",")[0].trim());
            setLat(pendingPin.lat ? String(pendingPin.lat) : "");
            setLon(pendingPin.lon ? String(pendingPin.lon) : "");
            // Pre-fill search bar with the display name (read-only hint)
            setLocQuery(pendingPin.displayName);
            setError(null);
        }
    }, [pendingPin]);

    // Debounced Nominatim autocomplete
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!locQuery.trim() || locQuery.length < 2) {
            setSuggestions([]);
            setSuggestionsOpen(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locQuery)}&format=json&limit=5`,
                    { headers: { "Accept-Language": "en", "User-Agent": "PeopleContextOS-Dashboard/1.0" } }
                );
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                setSuggestionsOpen(data.length > 0);
            } catch {
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [locQuery]);

    // Close suggestions on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node))
                setSuggestionsOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const pickSuggestion = (s: Suggestion) => {
        setLocQuery(s.display_name);
        setName((prev) => prev || s.display_name.split(",")[0].trim());
        setLat(parseFloat(s.lat).toFixed(6));
        setLon(parseFloat(s.lon).toFixed(6));
        setSuggestions([]);
        setSuggestionsOpen(false);
    };

    const handleClose = () => {
        setPendingPin(null);
        setName(""); setLat(""); setLon(""); setRadius("200");
        setCategory("other"); setProjectInfo(""); setLocQuery("");
        setSuggestions([]); setSuggestionsOpen(false); setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        const r = parseFloat(radius);

        if (!name.trim()) { setError("Name is required."); return; }
        if (isNaN(parsedLat) || isNaN(parsedLon)) { setError("Valid latitude and longitude are required."); return; }
        if (isNaN(r) || r <= 0) { setError("Radius must be a positive number."); return; }

        setSaving(true);
        setError(null);
        try {
            const fence = await createFence({
                name: name.trim(),
                latitude: parsedLat,
                longitude: parsedLon,
                radius: r,
                category,
                project_info: projectInfo.trim() || undefined,
            });
            addFence(fence); // instantly adds to the shared list
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save geofence.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={!!pendingPin} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                    <SheetTitle>Add Geofence</SheetTitle>
                    <SheetDescription>
                        Search for a location or enter coordinates manually.
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5 flex-1 overflow-y-auto px-6 py-5"
                >
                    {/* ── Location search ── */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Location</Label>
                        <div ref={searchContainerRef} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="Search for an address or place…"
                                value={locQuery}
                                onChange={(e) => setLocQuery(e.target.value)}
                                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                                disabled={saving}
                                className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-8 py-1 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {searching ? (
                                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                                ) : locQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => { setLocQuery(""); setSuggestions([]); setSuggestionsOpen(false); }}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                ) : null}
                            </div>

                            {/* Suggestions dropdown */}
                            {suggestionsOpen && suggestions.length > 0 && (
                                <ul className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-black/5 py-1 overflow-hidden">
                                    {suggestions.map((s) => (
                                        <li key={s.place_id}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                                                className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                                            >
                                                <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                                <span className="line-clamp-2 leading-snug text-gray-700">{s.display_name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* ── Lat / Lon ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fence-lat">Latitude *</Label>
                            <Input
                                id="fence-lat"
                                placeholder="e.g. 28.61390"
                                value={lat}
                                onChange={(e) => setLat(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fence-lon">Longitude *</Label>
                            <Input
                                id="fence-lon"
                                placeholder="e.g. 77.20900"
                                value={lon}
                                onChange={(e) => setLon(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    {/* ── Name ── */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fence-name">Name *</Label>
                        <Input
                            id="fence-name"
                            placeholder="e.g. Downtown Mall"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    {/* ── Radius ── */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fence-radius">Radius (metres) *</Label>
                        <Input
                            id="fence-radius"
                            type="number"
                            min={10}
                            max={50000}
                            step={10}
                            placeholder="200"
                            value={radius}
                            onChange={(e) => setRadius(e.target.value)}
                            disabled={saving}
                        />
                        <p className="text-xs text-muted-foreground">Circular radius from the centre point.</p>
                    </div>

                    {/* ── Category ── */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fence-category">Category *</Label>
                        <select
                            id="fence-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={saving}
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    {/* ── Project info ── */}
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="fence-project">Project info (optional)</Label>
                        <Input
                            id="fence-project"
                            placeholder="e.g. Q2 Campaign"
                            value={projectInfo}
                            onChange={(e) => setProjectInfo(e.target.value)}
                            disabled={saving}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <SheetFooter className="mt-auto pt-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={saving} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving} className="flex-1">
                            {saving ? <><Loader2 className="size-4 animate-spin" />Saving…</> : "Save Geofence"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
