import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",

  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),

  // Map Better Auth's camelCase field names to the snake_case columns in the DB
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: false, // users cannot set their own role via sign-up
      },
    },
    fields: {
      emailVerified: "email_verified",
      createdAt:     "created_at",
      updatedAt:     "updated_at",
    },
  },
  session: {
    fields: {
      expiresAt:  "expires_at",
      createdAt:  "created_at",
      updatedAt:  "updated_at",
      ipAddress:  "ip_address",
      userAgent:  "user_agent",
      userId:     "user_id",
    },
  },
  account: {
    fields: {
      accountId:               "account_id",
      providerId:              "provider_id",
      userId:                  "user_id",
      accessToken:             "access_token",
      refreshToken:            "refresh_token",
      idToken:                 "id_token",
      accessTokenExpiresAt:    "access_token_expires_at",
      refreshTokenExpiresAt:   "refresh_token_expires_at",
      createdAt:               "created_at",
      updatedAt:               "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
