import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            faceitId?: string;
            nickname?: string;
        };
    }

    interface User {
        faceitId?: string;
        nickname?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        faceitId?: string;
        nickname?: string;
    }
}
