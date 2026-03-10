"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import {
    Key,
    Plus,
    Copy,
    Check,
    Trash2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { listMyApiKeys, createMyApiKey, revokeMyApiKey } from "@/lib/api-keys-api";
import type { ApiKey } from "@/lib/types";
import { cn } from "@/lib/utils";

function relativeTime(date: string | null | undefined): string {
    if (!date) return "never";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [label, setLabel] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadKeys = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setKeys(await listMyApiKeys());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load keys");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadKeys(); }, [loadKeys]);

    const openSheet = () => {
        setLabel("");
        setNewKey(null);
        setCreateError(null);
        setCopied(false);
        setSheetOpen(true);
    };

    const handleCreate = async () => {
        if (!label.trim()) return;
        setCreating(true);
        setCreateError(null);
        try {
            const result = await createMyApiKey(label.trim());
            setNewKey(result.key);
            // Optimistically add to list without the raw key
            const { key: _raw, ...keyRecord } = result;
            setKeys((prev) => [keyRecord as ApiKey, ...prev]);
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : "Failed to create key");
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = () => {
        if (!newKey) return;
        navigator.clipboard.writeText(newKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRevoke = async (id: string, name: string) => {
        if (!confirm(`Revoke "${name}"? Any apps using it will stop working immediately.`)) return;
        try {
            await revokeMyApiKey(id);
            setKeys((prev) => prev.map((k) => k.id === id ? { ...k, active: false } : k));
        } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to revoke key");
        }
    };

    const handleSheetChange = (open: boolean) => {
        if (!open && newKey) loadKeys();
        setSheetOpen(open);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">SDK API Keys</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generate keys to authenticate your Android SDK with PeopleContext.
                    </p>
                </div>
                <Button onClick={openSheet} className="gap-2 shrink-0">
                    <Plus className="size-4" />
                    Generate Key
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <Card className="border-destructive/50">
                    <CardContent className="flex items-center gap-3 pt-5 text-destructive">
                        <AlertCircle className="size-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </CardContent>
                </Card>
            ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
                    <Key className="size-12 opacity-20" />
                    <div>
                        <p className="text-sm font-medium">No API keys yet</p>
                        <p className="text-xs mt-0.5">Generate a key to start using the SDK</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map((key) => (
                        <Card key={key.id} className={cn(!key.active && "opacity-55")}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-base">{key.label}</CardTitle>
                                            <span
                                                className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                                    key.active
                                                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {key.active ? "active" : "revoked"}
                                            </span>
                                        </div>
                                        <CardDescription className="font-mono text-xs mt-1">
                                            {key.key_prefix}…
                                        </CardDescription>
                                    </div>
                                    {key.active && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRevoke(key.id, key.label)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                    <span>Created {relativeTime(key.created_at)}</span>
                                    <span>·</span>
                                    <span>Last used {relativeTime(key.last_used)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Generate Key Sheet */}
            <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Generate API Key</SheetTitle>
                        <SheetDescription>
                            Give this key a descriptive name so you can identify it later.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="px-4 pb-4 space-y-4 mt-2">
                        {!newKey ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="key-label">Key label</Label>
                                    <Input
                                        id="key-label"
                                        placeholder="e.g. Production Android App"
                                        value={label}
                                        onChange={(e) => setLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                        disabled={creating}
                                    />
                                </div>
                                {createError && (
                                    <p className="text-sm text-destructive flex items-center gap-2">
                                        <AlertCircle className="size-4 shrink-0" />
                                        {createError}
                                    </p>
                                )}
                                <SheetFooter>
                                    <Button
                                        onClick={handleCreate}
                                        disabled={!label.trim() || creating}
                                        className="w-full gap-2"
                                    >
                                        {creating && <Loader2 className="size-4 animate-spin" />}
                                        Generate
                                    </Button>
                                </SheetFooter>
                            </>
                        ) : (
                            <>
                                {/* One-time warning */}
                                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-3 space-y-1">
                                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                                        ⚠ Copy this key now — it won&apos;t be shown again
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-500">
                                        Store it securely in your app&apos;s configuration.
                                    </p>
                                </div>

                                {/* Key display */}
                                <div className="space-y-1.5">
                                    <Label>Your new API key</Label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all leading-relaxed">
                                            {newKey}
                                        </code>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={handleCopy}
                                            className="shrink-0 self-start"
                                        >
                                            {copied
                                                ? <Check className="size-4 text-green-600" />
                                                : <Copy className="size-4" />
                                            }
                                        </Button>
                                    </div>
                                </div>

                                {/* Usage hint */}
                                <div className="space-y-1.5">
                                    <p className="text-xs text-muted-foreground">
                                        Add to your Android app&apos;s{" "}
                                        <code className="bg-muted px-1 py-0.5 rounded text-xs">local.properties</code>:
                                    </p>
                                    <pre className="rounded-md border bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">
{`sdk.apiKey=${newKey}`}
                                    </pre>
                                </div>

                                <Button variant="outline" className="w-full" onClick={() => setSheetOpen(false)}>
                                    Done
                                </Button>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
