export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",

  modules: ["@nuxt/ui"],

  devtools: { enabled: true },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      apiBase: "http://localhost:3333",
      wsUrl: "ws://localhost:3333/ws",
    },
  },

  app: {
    head: {
      title: "Tercela",
      meta: [
        { name: "description", content: "Plataforma omnichannel de atendimento" },
      ],
    },
  },
});
