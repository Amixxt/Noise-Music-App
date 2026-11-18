import { auth } from "@/auth"

type SpotifyTrack = {
  id: string
  name: string
  uri: string
  artists?: { name?: string }[]
  album?: { images?: { url?: string }[] }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query || query.length > 100) return Response.json({ error: "Enter a valid search." }, { status: 400 })

  const session = await auth()
  const accessToken = (session as typeof session & { accessToken?: string } | null)?.accessToken
  if (!accessToken) return Response.json({ error: "Connect Spotify to search and play." }, { status: 401 })

  const response = await fetch(`https://api.spotify.com/v1/search?type=track&limit=12&q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!response.ok) return Response.json({ error: "Spotify search is unavailable." }, { status: response.status })

  const payload = await response.json() as { tracks?: { items?: SpotifyTrack[] } }
  const results = (payload.tracks?.items ?? []).map((track) => ({
    id: track.id,
    uri: track.uri,
    title: track.name,
    artist: track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Spotify",
    thumbnail: track.album?.images?.[0]?.url ?? "",
  }))
  return Response.json({ results })
}
