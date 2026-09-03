console.log("LOADING MY NUXT CONFIG")
export default defineNuxtConfig({
  runtimeConfig: {
    CHANNEL_NAME: '',
    PARENT_NAME: '',
    AUTH0_CLIENTID: '',
    AUTH0_SECRET: '',
    BASEURL: '',
    ISSUER: '',
    public: {
      CONFIRMATION_TIMER_DURATION: '',
      LOCALHOST: '',
      PORT_CLIENT_GM: '',
      PORT_WSS_CONTROLLER_CLIENT: '',
      PORT_SSE_GM: '',
      janusUrl:
        process.env.NUXT_PUBLIC_JANUS_URL ?? 
        "http://10.42.0.1:8088/janus",
      
      janusStreamId:
        Number(process.env.NUXT_PUBLIC_JANUS_STREAM_ID ?? 43),
    }
  },
  

  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],

  // Customize Tailwind by merging your own config
  tailwindcss: {
    config: {
      darkMode: 'class',
      theme: {
        extend: {
          // add custom colors or other theme extensions here
        }
      },
      plugins: []
    }
  },

  components: [
    { path: '~/components', pathPrefix: false } // Ensures auto-import without modifying _GlobalComponents
  ],

  nitro: {
    compatibilityDate: '2026-07-18'
  }
})
