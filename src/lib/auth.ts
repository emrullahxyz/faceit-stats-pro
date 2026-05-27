import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import FaceitProvider from "next-auth/providers/faceit";

export const authOptions: NextAuthOptions = {
    providers: [
        FaceitProvider({
            clientId: process.env.AUTH_FACEIT_ID || "",
            clientSecret: process.env.AUTH_FACEIT_SECRET || "",
        }),
    ],
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
