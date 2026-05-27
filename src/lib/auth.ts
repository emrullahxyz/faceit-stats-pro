import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

// Custom Faceit provider
const FaceitProvider = {
    id: "faceit",
    name: "Faceit",
    type: "oauth" as const,
    authorization: {
        url: "https://accounts.faceit.com/accounts",
        params: {
            client_id: process.env.AUTH_FACEIT_ID,
            response_type: "code",
            scope: "openid profile email",
        },
    },
    token: "https://api.faceit.com/auth/v1/oauth/token",
    userinfo: "https://api.faceit.com/auth/v1/resources/userinfo",
    clientId: process.env.AUTH_FACEIT_ID,
    clientSecret: process.env.AUTH_FACEIT_SECRET,
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
};

export const authOptions: NextAuthOptions = {
    providers: [FaceitProvider as unknown as NextAuthOptions["providers"][number]],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.accessToken = account.access_token;
                token.faceitId = (profile as { guid?: string }).guid;
                token.nickname = (profile as { nickname?: string }).nickname;
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

// Route handlers — only export these from the API route file, not here
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
