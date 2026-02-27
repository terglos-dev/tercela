export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",

  modules: ["@nuxt/ui", "@nuxtjs/i18n"],

  devtools: { enabled: true },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      // Override via NUXT_PUBLIC_API_BASE and NUXT_PUBLIC_WS_URL env vars
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3333",
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || "ws://localhost:3333/ws",
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || "",
    },
  },

  i18n: {
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "es", name: "Español", file: "es.json" },
      { code: "hi", name: "हिन्दी", file: "hi.json" },
      { code: "ar", name: "العربية", file: "ar.json" },
      { code: "id", name: "Bahasa Indonesia", file: "id.json" },
      { code: "tr", name: "Türkçe", file: "tr.json" },
    ],
    defaultLocale: "en",
    strategy: "no_prefix",
    lazy: true,
    langDir: "locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      fallbackLocale: "en",
    },
  },

  app: {
    head: {
      title: "Tercela",
      meta: [
        { name: "description", content: "Open-source omnichannel platform for customer communication" },
      ],
    },
  },
});
