import { auth } from "@/auth"

export async function GET() {
  const session = await auth()
  const accessToken = (session as typeof session & { accessToken?: string } | null)?.accessToken
  if (!accessToken) return Response.json({ error: "Sign in with Spotify." }, { status: 401 })
  return Response.json({ accessToken }, { headers: { "cache-control": "no-store" } })
}
