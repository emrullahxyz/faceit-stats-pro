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
            redirect_popup: "true",
            response_type: "code",
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
                (session as { accessToken?: string }).accessToken = token.accessToken as string;
                (session.user as { faceitId?: string }).faceitId = token.faceitId as string;
                (session.user as { nickname?: string }).nickname = token.nickname as string;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const auth = handler;
