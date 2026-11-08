import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  socialProviders: google,
  // Guests are created only through `startDemo`, which applies the app's own limits and seeds the
  // account. Closing the HTTP route keeps anyone from skipping those limits; `auth.api` calls from
  // the server are not affected.
  disabledPaths: ["/sign-in/anonymous"],
  plugins: [anonymous({ emailDomainName: "guest.invalid" }), nextCookies()],
});

export const googleEnabled = !!google;
