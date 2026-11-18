"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { signIn } from "next-auth/react"

type Track = { id: string; uri?: string; title: string; artist: string; thumbnail: string }
type Theme = "light" | "dark" | "system"
type SpotifyPlayer = {
  connect: () => Promise<boolean>
  togglePlay: () => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
  addListener: (event: string, callback: (value: { device_id?: string }) => void) => void
  disconnect: () => void
}
type SpotifyWindow = Window & {
  onSpotifyWebPlaybackSDKReady?: () => void
  Spotify?: { Player: new (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number }) => SpotifyPlayer }
}

const featured: Track[] = [
  { id: "4cOdK2wGLETKBW3PvgPWqT", uri: "spotify:track:4cOdK2wGLETKBW3PvgPWqT", title: "Never Gonna Give You Up", artist: "Rick Astley", thumbnail: "https://images.unsplash.com/photo-1500305614571-ae5b6592e65d?auto=format&fit=crop&w=900&q=85" },
  { id: "7ouMYWpwJ422jRcDASZB7P", uri: "spotify:track:7ouMYWpwJ422jRcDASZB7P", title: "Knights of Cydonia", artist: "Muse", thumbnail: "https://images.unsplash.com/photo-1508179522353-11ba468c4a1c?auto=format&fit=crop&w=700&q=85" },
  { id: "0VjIjW4GlUZAMYd2vXMi3b", uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b", title: "Blinding Lights", artist: "The Weeknd", thumbnail: "https://images.unsplash.com/photo-1655373325205-bbae7ede0e21?auto=format&fit=crop&w=700&q=85" },
]

function decode(value: string) {
  if (typeof document === "undefined") return value
  const element = document.createElement("textarea")
  element.innerHTML = value
  return element.value
}

function SettingToggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="setting-row"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>
}

export default function MusicApp() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Track[]>([])
  const [current, setCurrent] = useState<Track>(featured[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)
  const [view, setView] = useState<"discover" | "library" | "history">("discover")
  const [liked, setLiked] = useState<Track[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  const [quality, setQuality] = useState<"saver" | "high">("saver")
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playNonce, setPlayNonce] = useState(0)
  const [dolbySupported, setDolbySupported] = useState(false)
  const [theme, setTheme] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const playerRef = useRef<SpotifyPlayer | null>(null)
  const [spotifyToken, setSpotifyToken] = useState("")
  const [spotifyDevice, setSpotifyDevice] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [autoplay, setAutoplay] = useState(true)
  const [normalize, setNormalize] = useState(true)
  const [email, setEmail] = useState("")

  useEffect(() => {
    try {
      setLiked(JSON.parse(localStorage.getItem("noise-liked-songs") ?? "[]"))
      setRecentlyPlayed(JSON.parse(localStorage.getItem("noise-recently-played") ?? "[]"))
    } catch {
      setLiked([])
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false)
        setQueueOpen(false)
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault()
        setView("discover")
        window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Search Spotify music"]')?.focus(), 0)
      }
      if (event.key.toLowerCase() === "q" && document.activeElement?.tagName !== "INPUT") setQueueOpen((value) => !value)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/spotify/token").then(async (response) => {
      if (!response.ok) return
      const data = await response.json() as { accessToken?: string }
      if (!cancelled && data.accessToken) setSpotifyToken(data.accessToken)
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!spotifyToken) return
    const spotifyWindow = window as SpotifyWindow
    const setup = () => {
      if (!spotifyWindow.Spotify || playerRef.current) return
      const player = new spotifyWindow.Spotify.Player({
        name: "NOISE Web Player",
        getOAuthToken: (callback) => callback(spotifyToken),
        volume: 0.8,
      })
      player.addListener("ready", ({ device_id }) => {
        if (device_id) setSpotifyDevice(device_id)
      })
      void player.connect()
      playerRef.current = player
    }
    spotifyWindow.onSpotifyWebPlaybackSDKReady = setup
    if (spotifyWindow.Spotify) setup()
    else {
      const script = document.createElement("script")
      script.src = "https://sdk.scdn.co/spotify-player.js"
      script.async = true
      document.body.appendChild(script)
    }
    return () => {
      playerRef.current?.disconnect()
      playerRef.current = null
    }
  }, [spotifyToken])

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("noise-theme") as Theme | null
      const savedQuality = localStorage.getItem("noise-quality")
      const savedSettings = JSON.parse(localStorage.getItem("noise-settings") ?? "{}") as { notifications?: boolean; autoplay?: boolean; normalize?: boolean; email?: string }
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setTheme(savedTheme)
      }
      if (savedQuality === "saver" || savedQuality === "high") {
        setQuality(savedQuality)
      }
      if (typeof savedSettings.notifications === "boolean") setNotifications(savedSettings.notifications)
      if (typeof savedSettings.autoplay === "boolean") setAutoplay(savedSettings.autoplay)
      if (typeof savedSettings.normalize === "boolean") setNormalize(savedSettings.normalize)
      if (typeof savedSettings.email === "string") setEmail(savedSettings.email)
    } catch {
      // Storage can be unavailable in strict private browsing modes.
    } finally {
      setPreferencesLoaded(true)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const sync = () => setResolvedTheme(theme === "system" ? (media.matches ? "dark" : "light") : theme)
    sync()
    media.addEventListener("change", sync)
    if (preferencesLoaded) localStorage.setItem("noise-theme", theme)
    return () => media.removeEventListener("change", sync)
  }, [preferencesLoaded, theme])

  useEffect(() => {
    if (preferencesLoaded) localStorage.setItem("noise-quality", quality)
  }, [preferencesLoaded, quality])

  useEffect(() => {
    if (preferencesLoaded) localStorage.setItem("noise-settings", JSON.stringify({ notifications, autoplay, normalize, email }))
  }, [autoplay, email, normalize, notifications, preferencesLoaded])

  useEffect(() => {
    const mediaCapabilities = navigator.mediaCapabilities
    if (!mediaCapabilities?.decodingInfo) return
    void mediaCapabilities.decodingInfo({
      type: "file",
      audio: {
        contentType: 'audio/mp4; codecs="ec-3"',
        channels: "6",
        bitrate: 384000,
        samplerate: 48000,
      },
    }).then((result) => setDolbySupported(result.supported)).catch(() => setDolbySupported(false))
  }, [])

  function playTrack(track: Track) {
    setCurrent(track)
    setPlayNonce((value) => value + 1)
    setPlayerOpen(true)
    setIsPlaying(true)
    setRecentlyPlayed((songs) => {
      const next = [track, ...songs.filter((song) => song.id !== track.id)].slice(0, 30)
      localStorage.setItem("noise-recently-played", JSON.stringify(next))
      return next
    })
    if (spotifyToken && spotifyDevice && track.uri) {
      void fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(spotifyDevice)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${spotifyToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [track.uri] }),
      })
    }
  }

  function playerCommand(command: "playVideo" | "pauseVideo") {
    void playerRef.current?.togglePlay()
    setIsPlaying(command === "playVideo")
  }

  function skip(direction: -1 | 1) {
    const queue = list.length ? list : featured
    const index = queue.findIndex((track) => track.id === current.id)
    const nextIndex = index < 0 ? 0 : (index + direction + queue.length) % queue.length
    playTrack(queue[nextIndex])
  }

  function toggleLike(track: Track) {
    setLiked((songs) => {
      const exists = songs.some((song) => song.id === track.id)
      const next = exists ? songs.filter((song) => song.id !== track.id) : [track, ...songs]
      localStorage.setItem("noise-liked-songs", JSON.stringify(next))
      return next
    })
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setSearched(true)
    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
      const data = await response.json() as { results?: Track[]; error?: string }
      if (!response.ok) throw new Error(data.error)
      setResults(data.results ?? [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search failed.")
    } finally {
      setLoading(false)
    }
  }

  const list = searched ? results : featured
  const collection = view === "history" ? recentlyPlayed : liked
  const currentQueueIndex = Math.max(0, list.findIndex((track) => track.id === current.id))
  const upNext = [...list.slice(currentQueueIndex + 1), ...list.slice(0, currentQueueIndex)].slice(0, 8)

  return (
    <main className={`theme-${resolvedTheme} relative min-h-screen overflow-hidden bg-[#10110f] pb-32 text-[#f7f7ef]`}>
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <div className="noise-grid" aria-hidden="true" />
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-white/10 bg-[#10110f] p-7 lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 text-xl font-black tracking-tight">
          <span className="grid size-7 place-items-center rounded-full bg-[#d8ff57] text-black">N</span> NOISE
        </div>
        <nav className="mt-14 space-y-2">
          <button onClick={() => setView("discover")} className={`nav-item ${view === "discover" ? "active" : ""}`}>⌂ <span>Discover</span></button>
          <button onClick={() => { setView("discover"); document.querySelector("input")?.focus() }} className="nav-item">⌕ <span>Search</span></button>
          <button onClick={() => setView("library")} className={`nav-item ${view === "library" ? "active" : ""}`}>♫ <span>Your library</span></button>
          <button onClick={() => setView("history")} className={`nav-item ${view === "history" ? "active" : ""}`}>↺ <span>Recently played</span></button>
          <button onClick={() => setView("library")} className="mt-5 flex w-full items-center gap-3 rounded-xl bg-gradient-to-br from-violet-600/30 to-[#d8ff57]/10 p-3 text-left">
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-[#d8ff57] text-white">♥</span>
            <span><span className="block text-sm font-bold">Liked Songs</span><span className="text-xs text-white/40">{liked.length} songs</span></span>
          </button>
          <button onClick={() => setView("history")} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-left">
            <span className="grid size-9 place-items-center rounded-lg bg-[#ef6c37] text-white">↺</span>
            <span><span className="block text-sm font-bold">Last played</span><span className="text-xs text-white/40">{recentlyPlayed.length} songs</span></span>
          </button>
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <p className="text-sm font-semibold">Streaming ready</p>
          <p className="mt-1 text-xs leading-5 text-white/40">Millions of songs, one clean player.</p>
        </div>
      </aside>

      <section className="relative z-10 lg:ml-56">
        <header className="flex items-center justify-between px-5 py-6 md:px-10 lg:px-12">
          <span className="text-xs font-bold uppercase tracking-[.22em] text-[#d8ff57]">Music without limits</span>
          <div className="flex items-center gap-2">
            {!spotifyToken && <button onClick={() => signIn("spotify")} className="rounded-full bg-[#d8ff57] px-4 py-2 text-xs font-black text-black">Connect Spotify</button>}
            <button onClick={() => setSettingsOpen(true)} className="settings-trigger" aria-label="Open settings">⚙</button>
            <button onClick={() => setView("history")} className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold lg:hidden">↺ {recentlyPlayed.length}</button>
            <button onClick={() => setView(view === "library" ? "discover" : "library")} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold lg:hidden">{view === "library" ? "Discover" : `♥ ${liked.length}`}</button>
          </div>
        </header>

        <div className="px-5 md:px-10 lg:px-12">
          {view === "discover" ? <><div className="mx-auto max-w-5xl py-12 text-center md:py-20">
            <p className="mb-3 text-sm font-semibold text-white/45">What do you want to hear?</p>
            <h1 className="hero-title text-5xl font-black tracking-[-.06em] sm:text-7xl">Find your <span>sound.</span></h1>
            <form onSubmit={search} className="search-shell mx-auto mt-8 flex max-w-2xl items-center rounded-2xl border border-white/10 bg-white/[.06] p-2 focus-within:border-[#d8ff57]/60">
              <span className="pl-4 text-xl text-white/35">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none placeholder:text-white/25" placeholder="Search songs, artists, moods..." aria-label="Search Spotify music" />
              <button className="rounded-xl bg-[#d8ff57] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50" disabled={loading}>{loading ? "Finding..." : "Search"}</button>
            </form>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </div>

          <div className="mb-5 flex items-end justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/35">{searched ? "Search results" : "Start listening"}</p><h2 className="mt-1 text-2xl font-bold">{searched ? `Results for “${query}”` : "Featured mixes"}</h2></div>
            {searched && <button onClick={() => { setSearched(false); setResults([]); setQuery("") }} className="text-sm text-white/45 hover:text-white">Clear search</button>}
          </div>

          {!loading && searched && !error && results.length === 0 && <div className="rounded-3xl border border-white/10 p-10 text-center text-white/45">No matching tracks found. Try another song or artist.</div>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((track) => (
              <article key={track.id} className={`music-card group overflow-hidden rounded-3xl border text-left ${current.id === track.id ? "is-playing border-[#d8ff57]/70 bg-white/[.08]" : "border-white/10 bg-white/[.035]"}`}>
                <div className="relative aspect-video overflow-hidden">
                  <button onClick={() => playTrack(track)} className="size-full"><img src={track.thumbnail} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" /></button>
                  <button onClick={() => playTrack(track)} className="play-bubble absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-[#d8ff57] text-lg text-black shadow-xl" aria-label={`Play ${decode(track.title)}`}>▶</button>
                </div>
                <div className="flex items-center gap-3 p-5"><button onClick={() => playTrack(track)} className="min-w-0 flex-1 text-left"><span className="block line-clamp-1 font-bold">{decode(track.title)}</span><span className="mt-1 block line-clamp-1 text-sm text-white/40">{decode(track.artist)}</span></button><button onClick={() => toggleLike(track)} className={`grid size-10 place-items-center rounded-full border transition ${liked.some((song) => song.id === track.id) ? "border-[#d8ff57]/50 bg-[#d8ff57]/15 text-[#d8ff57]" : "border-white/10 text-white/40 hover:text-white"}`} aria-label="Toggle favorite">♥</button></div>
              </article>
            ))}
          </div>
          </> : <section className="mx-auto max-w-5xl py-12 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#d8ff57]">{view === "history" ? "Listening history" : "Your library"}</p>
            <h1 className="mt-2 text-5xl font-black tracking-[-.055em] sm:text-7xl">{view === "history" ? "Recently Played." : "Liked Songs."}</h1>
            <p className="mt-3 text-white/45">{view === "history" ? `${recentlyPlayed.length} recently played songs.` : `${liked.length} favorites, ready whenever you are.`}</p>
            {collection.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-white/15 p-12 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-white/5 text-2xl">{view === "history" ? "↺" : "♥"}</div><h2 className="mt-5 text-xl font-bold">{view === "history" ? "Your listening history is empty" : "Your favorites live here"}</h2><p className="mt-2 text-sm text-white/40">{view === "history" ? "Songs you play will automatically appear here." : "Tap the heart on any song to build your collection."}</p><button onClick={() => setView("discover")} className="mt-6 rounded-xl bg-[#d8ff57] px-5 py-3 text-sm font-bold text-black">Discover music</button></div> :
              <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[.025]">
                {collection.map((track, index) => <div key={track.id} className="flex items-center gap-4 border-b border-white/[.07] p-3 last:border-0 sm:p-4"><span className="w-6 text-center text-xs text-white/30">{String(index + 1).padStart(2, "0")}</span><button onClick={() => playTrack(track)} className="flex min-w-0 flex-1 items-center gap-4 text-left"><img src={track.thumbnail} alt="" className="size-14 rounded-xl object-cover"/><span className="min-w-0"><span className="block truncate font-bold">{decode(track.title)}</span><span className="block truncate text-sm text-white/40">{decode(track.artist)}</span></span></button>{view === "library" && <button onClick={() => toggleLike(track)} className="grid size-10 place-items-center rounded-full text-[#d8ff57]" aria-label="Remove from liked songs">♥</button>}<button onClick={() => playTrack(track)} className="grid size-10 place-items-center rounded-full bg-white/5 hover:bg-[#d8ff57] hover:text-black" aria-label={`Play ${decode(track.title)}`}>▶</button></div>)}
              </div>}
          </section>}
        </div>
      </section>

      {settingsOpen && <div className="settings-overlay" role="dialog" aria-modal="true">
        <button className="settings-backdrop" onClick={() => setSettingsOpen(false)} aria-label="Close settings" />
        <aside className="settings-panel">
          <div className="settings-head"><div><p>NOISE</p><h2>Settings</h2></div><button onClick={() => setSettingsOpen(false)}>×</button></div>
          <div className="settings-content">
            <section className="settings-section"><h3>Appearance</h3><p>Choose the look for this device.</p><div className="theme-options">{([["light","☀ Light"],["system","◐ System"],["dark","☾ Dark"]] as [Theme,string][]).map(([value,label]) => <button key={value} onClick={() => setTheme(value)} className={theme===value?"active":""}>{label}</button>)}</div></section>
            <section className="settings-section"><h3>Playback</h3><SettingToggle title="Autoplay" detail="Keep music playing with similar tracks" checked={autoplay} onChange={setAutoplay}/><SettingToggle title="Normalize volume" detail="Balance loud and quiet tracks" checked={normalize} onChange={setNormalize}/><div className="setting-row disabled"><span><strong>12s gapless crossfade</strong><small>Spotify Web SDK does not support dual-stream crossfade</small></span><b>Unavailable</b></div></section>
            <section className="settings-section"><h3>Media quality</h3><div className="quality-options"><button onClick={() => setQuality("saver")} className={quality==="saver"?"active":""}>Data Saver<small>Lower data use</small></button><button onClick={() => setQuality("high")} className={quality==="high"?"active":""}>High Quality<small>Best available</small></button></div></section>
            <section className="settings-section"><h3>Notifications</h3><SettingToggle title="Now playing alerts" detail="Show live playback updates" checked={notifications} onChange={setNotifications}/></section>
            <section className="settings-section"><h3>Account & email</h3><input className="settings-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/><div className="device-card"><span className={spotifyDevice?"online-dot":"offline-dot"}/><div><strong>{spotifyToken?"Spotify connected":"Spotify not connected"}</strong><small>Premium account required for playback</small></div></div></section>
            <section className="settings-section"><h3>Apps & devices</h3><div className="device-card"><span>▣</span><div><strong>This browser</strong><small>{spotifyDevice?"Active playback device":"Waiting for connection"}</small></div><b>{spotifyDevice?"Active":"Offline"}</b></div></section>
            <section className="settings-section"><h3>Privacy & storage</h3><p>Liked songs and preferences stay on this device.</p><button className="danger-link" onClick={() => { localStorage.removeItem("noise-liked-songs"); setLiked([]) }}>Clear liked songs</button></section>
            <section className="settings-section"><h3>About & support</h3><div className="about-grid"><span>NOISE 1.0</span><button onClick={() => window.open("mailto:support@noise.app")}>Contact support ↗</button><button onClick={() => window.open("https://support.spotify.com","_blank")}>Spotify help ↗</button><span>Privacy · Terms</span></div></section>
          </div>
        </aside>
      </div>}

      {queueOpen && <div className="queue-overlay">
        <button className="queue-backdrop" onClick={() => setQueueOpen(false)} aria-label="Close queue" />
        <aside className="queue-panel">
          <div className="queue-head"><div><p>PLAYBACK</p><h2>Up Next</h2></div><button onClick={() => setQueueOpen(false)}>×</button></div>
          <div className="queue-now"><p>Now playing</p><div><img src={current.thumbnail} alt="" /><span><strong>{decode(current.title)}</strong><small>{decode(current.artist)}</small></span><div className="equalizer"><i/><i/><i/></div></div></div>
          <div className="queue-list"><p>Next in queue · {upNext.length}</p>{upNext.map((track, index) => <button key={track.id} onClick={() => playTrack(track)}><span>{String(index + 1).padStart(2,"0")}</span><img src={track.thumbnail} alt="" /><span><strong>{decode(track.title)}</strong><small>{decode(track.artist)}</small></span><b>▶</b></button>)}</div>
          <div className="queue-tip"><kbd>Q</kbd> Queue <span>·</span> <kbd>/</kbd> Search <span>·</span> <kbd>Esc</kbd> Close</div>
        </aside>
      </div>}

      {playerOpen && <section className="player-pop fixed bottom-24 right-3 z-[55] w-[calc(100%-1.5rem)] max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#171815] shadow-2xl md:right-6">
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="flex rounded-lg bg-white/5 p-1 text-xs font-semibold">
            <button onClick={() => setQuality("saver")} className={`rounded-md px-3 py-2 ${quality === "saver" ? "bg-[#d8ff57] text-black" : "text-white/45"}`}>Data Saver</button>
            <button onClick={() => setQuality("high")} className={`rounded-md px-3 py-2 ${quality === "high" ? "bg-[#d8ff57] text-black" : "text-white/45"}`}>High Quality</button>
          </div>
          <span className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white/65">{spotifyDevice ? "SPOTIFY READY" : "CONNECTING"}</span>
          <button onClick={() => setPlayerOpen(false)} className="grid size-8 place-items-center rounded-full bg-white/5 text-white/55" aria-label="Close player">×</button>
        </div>
        {dolbySupported && <div className="px-3 pb-2"><span className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-white/55">DOLBY CAPABLE DEVICE</span></div>}
        <div className="data-saver-stage">
          <div className="audio-visual">
            <div className="record-rings"><img src={current.thumbnail} alt="" /></div>
            <div className="visual-bars" aria-hidden="true">{Array.from({ length: 14 }, (_, index) => <i key={index}/>)}</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-5 px-4 py-3">
          <button onClick={() => skip(-1)} className="transport-button" aria-label="Previous song">Ⅰ◀</button>
          <button onClick={() => playerCommand(isPlaying ? "pauseVideo" : "playVideo")} className="transport-play" aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          <button onClick={() => skip(1)} className="transport-button" aria-label="Next song">▶Ⅰ</button>
        </div>
        <p className="px-4 pb-3 text-center text-[10px] text-white/35">{spotifyToken ? "Spotify Premium audio connected." : "Connect Spotify Premium to start audio playback."}</p>
      </section>}

      {notifications && <div className="fixed bottom-24 right-4 z-40 hidden w-72 rounded-2xl border border-white/10 bg-[#23251f]/95 p-3 shadow-2xl backdrop-blur-xl md:block">
        <div className="flex gap-3"><img className="now-cover size-12 rounded-xl object-cover" src={current.thumbnail} alt="" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#d8ff57]">Live activity</p><p className="truncate text-sm font-semibold">{decode(current.title)}</p><p className="truncate text-xs text-white/40">Playing · {decode(current.artist)}</p></div><div className="equalizer" aria-label="Playing"><i/><i/><i/></div></div>
      </div>}

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#171815]/95 px-4 py-3 backdrop-blur-2xl lg:left-56">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <img className="size-14 rounded-xl object-cover" src={current.thumbnail} alt="" />
          <div className="min-w-0 w-44 sm:w-60"><p className="truncate text-sm font-bold">{decode(current.title)}</p><p className="truncate text-xs text-white/40">{decode(current.artist)}</p></div>
          <button onClick={() => toggleLike(current)} className={`hidden size-10 place-items-center rounded-full border sm:grid ${liked.some((song) => song.id === current.id) ? "border-[#d8ff57]/50 text-[#d8ff57]" : "border-white/10 text-white/40"}`} aria-label="Favorite current song">♥</button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setQueueOpen(true)} className="queue-button" aria-label="Open queue"><span/><span/><span/></button>
            <button onClick={() => skip(-1)} className="transport-button hidden sm:grid" aria-label="Previous song">Ⅰ◀</button>
            <button onClick={() => { if (!playerOpen) { setPlayerOpen(true); setPlayNonce((value) => value + 1) } else playerCommand(isPlaying ? "pauseVideo" : "playVideo") }} className="footer-play grid size-11 place-items-center rounded-full bg-[#d8ff57] text-sm font-black text-black" aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying && playerOpen ? "Ⅱ" : "▶"}</button>
            <button onClick={() => skip(1)} className="transport-button hidden sm:grid" aria-label="Next song">▶Ⅰ</button>
          </div>
        </div>
      </footer>
    </main>
  )
}
