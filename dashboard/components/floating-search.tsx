"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X, MapPin } from "lucide-react";
import { useMapSearch } from "@/components/map-search-context";
import { cn } from "@/lib/utils";

interface Suggestion {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    type: string;
    class: string;
}

export function FloatingSearch() {
    const { flyToLocation } = useMapSearch();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close dropdown when clicking outside the component
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounced fetch of suggestions as user types
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim() || query.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                        query
                    )}&format=json&limit=6`,
                    {
                        headers: {
                            "Accept-Language": "en",
                            "User-Agent": "PeopleContextOS-Dashboard/1.0",
                        },
                    }
                );
                const data: Suggestion[] = await res.json();
                setSuggestions(data);
                setOpen(data.length > 0);
                setActiveIndex(-1);
            } catch {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const selectSuggestion = useCallback(
        (s: Suggestion) => {
            setQuery(s.display_name);
            setSuggestions([]);
            setOpen(false);
            flyToLocation(parseFloat(s.lat), parseFloat(s.lon), s.display_name);
        },
        [flyToLocation]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[activeIndex]);
        } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const target =
            activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
        if (target) selectSuggestion(target);
    };

    const clearSearch = () => {
        setQuery("");
        setSuggestions([]);
        setOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className="absolute top-3 left-14 z-1000 w-85 max-w-[calc(100vw-5rem)]"
        >
            <form onSubmit={handleSubmit}>
                {/* Search input pill */}
                <div className="relative flex items-center bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-black/5">
                    <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Search any location"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() =>
                            suggestions.length > 0 && setOpen(true)
                        }
                        className="flex-1 h-11 pl-10 pr-9 text-sm bg-transparent outline-none placeholder:text-muted-foreground rounded-2xl"
                    />
                    <div className="absolute right-3 flex items-center">
                        {loading ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : query ? (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="size-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-muted-foreground transition-colors"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Suggestions dropdown */}
                {open && suggestions.length > 0 && (
                    <ul className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] border border-black/5 py-1 overflow-hidden">
                        {suggestions.map((s, i) => (
                            <li key={s.place_id}>
                                <button
                                    type="button"
                                    // preventDefault stops the input losing focus before click fires
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectSuggestion(s);
                                    }}
                                    className={cn(
                                        "w-full flex items-start gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors",
                                        i === activeIndex && "bg-gray-50"
                                    )}
                                >
                                    <MapPin className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                                    <span className="line-clamp-2 leading-snug text-gray-700">
                                        {s.display_name}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </form>
        </div>
    );
}
