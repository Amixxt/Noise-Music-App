export type MakeSiteSettings = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

export const makeSiteSettings: MakeSiteSettings = {
  title: "Noise Music Player",
  description:
    "Stream and organize music in an ad-free player with an intuitive interface and live now-playing notifications across your devices.",
  robots: {
    index: false,
  },
  accessibility: {
    addBypassLinks: false,
  },
}

export function sanitizeHtmlAttribute(value: string | undefined): string {
  return value?.replace(/[^a-zA-Z0-9_-]/g, "") || ""
}
