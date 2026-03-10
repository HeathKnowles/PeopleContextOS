"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertCircle,
    Search,
    Users,
    ShieldCheck,
    User as UserIcon,
} from "lucide-react";
import { listUsers, updateUserRole } from "@/lib/users-api";
import { useSession } from "@/lib/auth-client";
import type { UserRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function UsersPage() {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setUsers(await listUsers());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleRoleChange = async (user: UserRecord) => {
        const newRole = user.role === "admin" ? "customer" : "admin";
        if (!confirm(`Change ${user.name}'s role to "${newRole}"?`)) return;
        setUpdating(user.id);
        try {
            await updateUserRole(user.id, newRole);
            setUsers((prev) =>
                prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u)
            );
        } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to update role");
        } finally {
            setUpdating(null);
        }
    };

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage user accounts and SDK access roles.
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search by name or email…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <Card className="border-destructive/50">
                    <CardContent className="flex items-center gap-3 pt-5 text-destructive">
                        <AlertCircle className="size-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </CardContent>
                </Card>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
                    <Users className="size-12 opacity-20" />
                    <p className="text-sm font-medium">
                        {search ? "No users match your search" : "No users yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((user) => {
                        const isMe = user.id === currentUserId;
                        const isAdmin = user.role === "admin";

                        return (
                            <Card key={user.id}>
                                <CardHeader className="pb-0">
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Avatar + info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="shrink-0 size-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary select-none">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <CardTitle className="text-sm font-medium truncate">
                                                        {user.name}
                                                    </CardTitle>
                                                    {isMe && (
                                                        <span className="text-xs text-muted-foreground">(you)</span>
                                                    )}
                                                </div>
                                                <CardDescription className="text-xs truncate">
                                                    {user.email}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        {/* Role badge + action */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={cn(
                                                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                                                    isAdmin
                                                        ? "bg-primary/15 text-primary"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {isAdmin
                                                    ? <ShieldCheck className="size-3" />
                                                    : <UserIcon className="size-3" />
                                                }
                                                {user.role}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isMe || updating === user.id}
                                                onClick={() => handleRoleChange(user)}
                                                className="text-xs h-7 px-2.5"
                                            >
                                                {updating === user.id ? (
                                                    <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                                ) : isAdmin ? "Demote" : "Make Admin"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2 pb-4">
                                    <p className="text-xs text-muted-foreground">
                                        Joined {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
