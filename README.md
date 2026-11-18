# 🎵 NOISE Music Player

Modern, responsive cross-platform web music player built with Next.js 16, React 19, Tailwind CSS, and NextAuth Spotify integration.

---

## ✨ Features

- **Spotify Web Playback SDK**: Play full audio directly in browser (Spotify Premium).
- **Search Music**: Live track searching powered by the Spotify Web API.
- **Liked Songs & History**: Saved directly in browser `localStorage`.
- **Customization**: Dark / Light / System themes, audio quality toggle, and playback controls.
- **Responsive Design**: Polished, modern UI built with Tailwind CSS.

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- Node.js >= 20.x
- pnpm / npm

### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the Spotify API credentials:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an App.
3. In app settings, add Redirect URI:
   `http://localhost:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret into `.env.local`.

### 4. Run Development Server
```bash
pnpm dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel (Step-by-Step)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Fix project structure and prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your GitHub repository: `Noise-Music-App`.
   - Framework preset will automatically be detected as **Next.js**.

3. **Configure Environment Variables in Vercel**:
   Under **Environment Variables**, add:
   - `AUTH_SECRET`: (Any random string, or generate via `npx auth secret`)
   - `AUTH_SPOTIFY_ID`: Your Spotify Developer Client ID
   - `AUTH_SPOTIFY_SECRET`: Your Spotify Developer Client Secret
   - `NEXT_PUBLIC_SITE_URL`: `https://your-project-name.vercel.app`

4. **Update Spotify Redirect URI**:
   In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) app settings, add your Vercel production redirect URI:
   ```
   https://your-project-name.vercel.app/api/auth/callback/spotify
   ```

5. **Deploy**:
   Click **Deploy**! The build will succeed in a few seconds.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4
- **Authentication**: NextAuth.js v5 (Spotify Provider)
- **Deployment**: Vercel
