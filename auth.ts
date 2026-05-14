import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/modules/auth/models/User";
import { compare } from "bcryptjs";
import { Permission, ROLE_PERMISSIONS } from "@/lib/constants";
import { UserRole } from "./config/site";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class InactiveAccountError extends CredentialsSignin {
  code = "inactive_account";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        if (!email || !password) throw new InvalidCredentialsError();

        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase() })
          .select("+password")
          .lean();

        if (!user) throw new InvalidCredentialsError();
        if (!user.isActive) throw new InactiveAccountError();

        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) throw new InvalidCredentialsError();

        // Update last login
        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          tenantId: user.tenantId.toString(),
          role: user.role,
          permissions: user.permissions.length
            ? user.permissions
            : ROLE_PERMISSIONS[user.role] ?? [],
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // First sign in — user object is populated
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as UserRole;
        session.user.permissions = token.permissions as Permission[];
      }
      return session;
    },
  },
});