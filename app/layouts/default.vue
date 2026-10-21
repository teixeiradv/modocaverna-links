<script setup lang="ts">
import { LayoutDashboard } from '@lucide/vue'

const { title } = useAppConfig()
</script>

<template>
  <div
    class="
      mc-cave flex min-h-svh flex-col overflow-x-clip bg-background
      text-foreground
    "
  >
    <a
      href="#main-content"
      class="
        fixed top-4 left-4 z-50 -translate-y-24 rounded-md bg-background px-4
        py-2 text-sm font-medium shadow-lg
        focus:translate-y-0
        focus-visible:ring-2 focus-visible:ring-ring
      "
    >
      {{ $t('layouts.links.skip_to_content') }}
    </a>

    <header class="relative z-20 pt-[env(safe-area-inset-top)]">
      <div
        class="
          mx-auto flex max-w-5xl items-center justify-between gap-4 p-4
          sm:px-6
        "
      >
        <NuxtLink to="/" :title="title" class="flex items-center">
          <img
            src="/mc-logo.png"
            :alt="title"
            width="160"
            height="44"
            class="
              h-9 w-auto
              sm:h-11
            "
          >
        </NuxtLink>
        <Button
          as-child variant="outline" size="sm" class="
            border-white/15 bg-white/5
          "
        >
          <NuxtLink to="/dashboard/links">
            <LayoutDashboard class="size-4" aria-hidden="true" />
            Painel
          </NuxtLink>
        </Button>
      </div>
    </header>

    <main id="main-content" class="relative z-10 flex flex-1 flex-col">
      <slot />
    </main>

    <footer
      class="relative z-10 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <p class="text-center text-xs tracking-wide text-muted-foreground">
        MODO CAVERNA · Ninguém virá salvar você.
      </p>
    </footer>
  </div>
</template>

<style scoped>
.mc-cave {
  background:
    radial-gradient(60rem 30rem at 50% -10%, rgb(234 27 45 / 18%), transparent 70%),
    radial-gradient(40rem 20rem at 50% 110%, rgb(234 27 45 / 8%), transparent 70%), var(--background);
}
</style>
