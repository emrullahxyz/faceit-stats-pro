import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign In | Faceit Stats Pro",
    description: "Sign in with your Faceit account to save favorites and access personalized stats.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
