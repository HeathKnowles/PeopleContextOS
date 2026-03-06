"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";

interface AuthPayload {
    mode: AuthMode;
    email: string;
    password: string;
    name?: string;
}

async function submitAuth(payload: AuthPayload) {
    const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    return res.json();
}

export default function AuthCard() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const isSignup = mode === "signup";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: AuthPayload = {
            mode,
            email,
            password,
            ...(isSignup && { name }),
        };
        await submitAuth(payload);
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
                    <Button variant="link" type="button" onClick={() => setMode(isSignup ? "login" : "signup")}>
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
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button type="submit" form="auth-form" className="w-full">
                    {isSignup ? "Sign Up" : "Login"}
                </Button>
            </CardFooter>
        </Card>
        </main>
    );
}