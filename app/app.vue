<script setup lang="ts">
import 'vue-sonner/style.css'

const { title, description, image } = useAppConfig()
const route = useRoute()
const localeHead = useLocaleHead()

useSeoMeta({
  title,
  description,
  ogType: 'website',
  ogTitle: title,
  ogSiteName: title,
  ogDescription: description,
  ogImage: image,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
    {
      name: 'theme-color',
      content: '#0b0b0c',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: computed(() => `https://linkmc.modocaverna.com${route.path}`),
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: '',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap',
    },
    {
      rel: 'icon',
      type: 'image/png',
      href: '/icon-192.png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
    },
  ],
}))
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="var(--primary)" />
    <NuxtPage />
    <Toaster position="top-center" rich-colors />
  </NuxtLayout>
</template>
