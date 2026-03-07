import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Backend Fastify server — not the Next.js app
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
