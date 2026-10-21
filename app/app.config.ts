export default defineAppConfig({
  title: 'Modo Caverna Links',
  documentation: '',
  github: '',
  coffee: '',
  twitter: '',
  telegram: '',
  description: 'Encurtador de links oficial do Modo Caverna.',
  image: '/mc-logo.png',
  previewTTL: 300, // 5 minutes
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
