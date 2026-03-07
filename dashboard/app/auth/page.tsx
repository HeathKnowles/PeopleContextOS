"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

type AuthMode = "login" | "signup";

export default function AuthCard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    const [mode, setMode] = useState<AuthMode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isSignup = mode === "signup";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isSignup) {
                const { error: err } = await signUp.email({
                    email,
                    password,
                    name,
                    callbackURL: callbackUrl,
                });
                if (err) { setError(err.message ?? "Sign up failed"); return; }
            } else {
                const { error: err } = await signIn.email({
                    email,
                    password,
                    callbackURL: callbackUrl,
                });
                if (err) { setError(err.message ?? "Sign in failed"); return; }
            }
            router.push(callbackUrl);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex flex-col justify-center items-center h-screen gap-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">PeopleContextOS</h1>
            <p className="text-sm text-muted-foreground mt-1">People-first context management</p>
        </div>
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>{isSignup ? "Create an account" : "Login to your account"}</CardTitle>
                <CardDescription>
                    {isSignup
                        ? "Enter your details below to create your account"
                        : "Enter your email below to login into your account"}
                </CardDescription>
                <CardAction>
                    <Button variant="link" type="button" onClick={() => { setMode(isSignup ? "login" : "signup"); setError(null); }}>
                        {isSignup ? "Login" : "Sign Up"}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <form id="auth-form" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        {isSignup && (
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="johndoe@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Min. 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button type="submit" form="auth-form" className="w-full" disabled={loading}>
                    {loading ? "Please wait…" : isSignup ? "Sign Up" : "Login"}
                </Button>
            </CardFooter>
        </Card>
        </main>
    );
}