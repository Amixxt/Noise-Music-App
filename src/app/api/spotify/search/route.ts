import { auth } from "@/auth"

type SpotifyTrack = {
  id: string
  name: string
  uri: string
  artists?: { name?: string }[]
  album?: { images?: { url?: string }[] }
}

const fallbackTracks = [
  {
    id: "4cOdK2wGLETKBW3PvgPWqT",
    uri: "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
    title: "Never Gonna Give You Up (Synthwave)",
    artist: "Rick Astley",
    thumbnail:
      "https://images.unsplash.com/photo-1500305614571-ae5b6592e65d?auto=format&fit=crop&w=900&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "7ouMYWpwJ422jRcDASZB7P",
    uri: "spotify:track:7ouMYWpwJ422jRcDASZB7P",
    title: "Knights of Cydonia (Electro Rock)",
    artist: "Muse",
    thumbnail:
      "https://images.unsplash.com/photo-1508179522353-11ba468c4a1c?auto=format&fit=crop&w=700&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "0VjIjW4GlUZAMYd2vXMi3b",
    uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b",
    title: "Blinding Lights (Midnight Mix)",
    artist: "The Weeknd",
    thumbnail:
      "https://images.unsplash.com/photo-1655373325205-bbae7ede0e21?auto=format&fit=crop&w=700&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "3nd4lK89sJ901msKLMnoPq",
    uri: "spotify:track:3nd4lK89sJ901msKLMnoPq",
    title: "Cyberpunk City Nights",
    artist: "Neon Horizon",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
  {
    id: "8mn992LKMsd092mmskd101",
    uri: "spotify:track:8mn992LKMsd092mmskd101",
    title: "Lofi Chill Resonance",
    artist: "Aura Beats",
    thumbnail:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=700&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    id: "1923kmd9102mkdsl0293km",
    uri: "spotify:track:1923kmd9102mkdsl0293km",
    title: "Deep Focus Ambient Flow",
    artist: "Solar Waves",
    thumbnail:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=85",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  },
]

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query || query.length > 100) {
    return Response.json({ error: "Enter a valid search." }, { status: 400 })
  }

  try {
    const session = await auth()
    const accessToken = (
      session as (typeof session & { accessToken?: string }) | null
    )?.accessToken

    if (accessToken) {
      const response = await fetch(
        `https://api.spotify.com/v1/search?type=track&limit=12&q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      )
      if (response.ok) {
        const payload = (await response.json()) as {
          tracks?: { items?: SpotifyTrack[] }
        }
        const results = (payload.tracks?.items ?? []).map((track) => ({
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist:
            track.artists
              ?.map((artist) => artist.name)
              .filter(Boolean)
              .join(", ") || "Spotify",
          thumbnail: track.album?.images?.[0]?.url ?? "",
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        }))
        return Response.json({ results })
      }
    }
  } catch {
    // Fall back to local search if Spotify is unavailable
  }

  // Local search across catalog when Spotify is not connected
  const qLower = query.toLowerCase()
  const filtered = fallbackTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower),
  )

  return Response.json({
    results: filtered.length ? filtered : fallbackTracks,
    isLocal: true,
  })
}
