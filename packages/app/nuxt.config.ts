import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['shadcn-nuxt', '@vueuse/nuxt'],

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  // Workspace packages are consumed as TypeScript sources (no build step).
  build: {
    transpile: ['@tripsalesagent/core', '@tripsalesagent/database'],
  },
  nitro: {
    externals: {
      inline: ['@tripsalesagent/core', '@tripsalesagent/database'],
    },
  },

  typescript: {
    strict: true,
  },
})
