import NextAuth from "next-auth"
import Spotify from "next-auth/providers/spotify"

if (
  !process.env.AUTH_URL &&
  process.env.NEXT_PUBLIC_SITE_URL &&
  !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
) {
  process.env.AUTH_URL = process.env.NEXT_PUBLIC_SITE_URL
}

const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ")

export const { handlers, auth } = NextAuth({
  trustHost: true,
  providers: [
    Spotify({
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: { scope: scopes },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      if (typeof token.expiresAt === "number" && Date.now() < token.expiresAt * 1000 - 30_000) {
        return token
      }

      if (!token.refreshToken) return token

      try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: String(token.refreshToken),
          }),
        })
        const refreshed = await response.json()
        if (!response.ok) throw new Error("Spotify token refresh failed")
        token.accessToken = refreshed.access_token
        token.expiresAt = Math.floor(Date.now() / 1000 + refreshed.expires_in)
        token.refreshToken = refreshed.refresh_token ?? token.refreshToken
      } catch {
        token.error = "RefreshAccessTokenError"
      }
      return token
    },
    session({ session, token }) {
      Object.assign(session, {
        accessToken: token.accessToken,
        spotifyError: token.error,
      })
      return session
    },
  },
})
