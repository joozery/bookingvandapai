import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

// Fix: next-auth/providers/line is a CJS module; Turbopack resolves it as
// a double-nested default export. We normalise it here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _LineProviderModule = require("next-auth/providers/line")
const LineProvider: (options: { clientId: string; clientSecret: string }) => any =
  _LineProviderModule?.default?.default ?? _LineProviderModule?.default ?? _LineProviderModule

const authOptions = {
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID || "",
      clientSecret: process.env.LINE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const { data: admin } = await supabase
          .from("admins")
          .select("*")
          .eq("username", credentials.username)
          .single();
          
        if (!admin || admin.isBlocked) return null;
        
        const isValid = await bcrypt.compare(credentials.password, admin.password);
        if (!isValid) return null;
        
        return {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          role: "admin",
          permissions: admin.permissions || []
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }: any) {
      if (account) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.permissions = user.permissions;
          token.name = user.name; // expose name to JWT
          token.username = user.username; // expose username to JWT
          token.name = user.name; // <-- add name to JWT
        }
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions || [];
        session.user.name = token.name; // expose name to session
        session.user.username = token.username; // expose username to session
        session.user.name = token.name; // <-- expose name to session
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
export { authOptions }
