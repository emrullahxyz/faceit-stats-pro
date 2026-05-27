import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

const CustomFaceitProvider = {
    id: "faceit",
    name: "FACEIT",
    type: "oauth" as const,
    authorization: {
        url: "https://accounts.faceit.com/accounts",
        params: {
            scope: "openid profile email",
        },
    },
    checks: ["pkce", "state"] as ("pkce" | "state" | "none" | "nonce")[], // Enable PKCE as Faceit OAuth strictly requires it
    token: "https://api.faceit.com/auth/v1/oauth/token",
    userinfo: "https://api.faceit.com/auth/v1/resources/userinfo",
    headers: {
        Authorization: `Basic ${Buffer.from(
            `${process.env.AUTH_FACEIT_ID}:${process.env.AUTH_FACEIT_SECRET}`
        ).toString("base64")}`,
    },
    profile(profile: {
        guid: string;
        nickname: string;
        email?: string;
        picture?: string;
        locale?: string;
    }) {
        return {
            id: profile.guid,
            name: profile.nickname,
            email: profile.email,
            image: profile.picture,
        };
    },
    clientId: process.env.AUTH_FACEIT_ID,
    clientSecret: process.env.AUTH_FACEIT_SECRET,
};

export const authOptions: NextAuthOptions = {
    providers: [CustomFaceitProvider],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.accessToken = account.access_token;
                token.faceitId = (profile as { guid?: string }).guid || (profile as { id?: string }).id;
                token.nickname = (profile as { nickname?: string }).nickname || (profile as { name?: string }).name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.accessToken = token.accessToken as string;
                (session.user as { faceitId?: string }).faceitId = token.faceitId as string;
                (session.user as { nickname?: string }).nickname = token.nickname as string;
            }
            return session;
        },
    },
};

// Route handlers
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
