<script setup lang="ts">
import type { CounterData } from '@/types'
import { ArrowRight, BarChart3, Check, Copy, ExternalLink, Link2, ListOrdered, Loader2, Lock, QrCode, Scissors } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'

interface ShortLink {
  id: string
  slug: string
  url: string
  createdAt: number
}

const host = 'linkmc.modocaverna.com'
const origin = import.meta.client ? window.location.origin : `https://${host}`

const authState = shallowRef<'checking' | 'out' | 'in'>('checking')
const password = shallowRef('')
const loggingIn = shallowRef(false)
const loginError = shallowRef('')

const url = shallowRef('')
const slug = shallowRef('')
const creating = shallowRef(false)
const created = shallowRef<{ shortLink: string, url: string } | null>(null)
const showQR = shallowRef(false)

const recent = ref<ShortLink[]>([])
const recentCounters = ref<Record<string, CounterData>>({})
const topLinks = ref<{ name: string, count: number }[]>([])
const totalLinks = shallowRef<number | null>(null)
const stats = ref({ day: 0, week: 0, weekVisitors: 0, all: 0 })
const statsLoaded = shallowRef(false)

const { copy } = useClipboard()
const copiedKey = shallowRef('')

function shortUrl(s: string) {
  return `${origin}/${s}`
}

async function copyLink(s: string, key = s) {
  await copy(s.startsWith('http') ? s : shortUrl(s))
  copiedKey.value = key
  toast.success('Link copiado')
  setTimeout(() => {
    if (copiedKey.value === key)
      copiedKey.value = ''
  }, 1500)
}

function hostOf(value: string) {
  try {
    return new URL(value).host.replace(/^www\./, '')
  }
  catch {
    return value
  }
}

function randomSlug() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

function nowSec() {
  return Math.floor(Date.now() / 1000)
}

async function counters(startAt?: number) {
  const res = await useAPI<{ data?: CounterData[] }>('/api/stats/counters', {
    query: startAt ? { startAt, endAt: nowSec() } : {},
  })
  return res.data?.[0] ?? { visits: 0, visitors: 0, referers: 0 }
}

async function loadStats() {
  const weekAgo = nowSec() - 7 * 86400
  const [day, week, all, top] = await Promise.allSettled([
    counters(nowSec() - 86400),
    counters(weekAgo),
    counters(),
    useAPI<{ data?: { name: string, count: number }[] }>('/api/stats/metrics', {
      query: { type: 'slug', startAt: weekAgo, endAt: nowSec(), limit: 5 },
    }),
  ])
  stats.value = {
    day: day.status === 'fulfilled' ? Number(day.value.visits) || 0 : 0,
    week: week.status === 'fulfilled' ? Number(week.value.visits) || 0 : 0,
    weekVisitors: week.status === 'fulfilled' ? Number(week.value.visitors) || 0 : 0,
    all: all.status === 'fulfilled' ? Number(all.value.visits) || 0 : 0,
  }
  topLinks.value = top.status === 'fulfilled' ? (top.value.data ?? []).filter(i => i.name) : []
  statsLoaded.value = true
}

async function loadRecent() {
  const [list, count] = await Promise.all([
    useAPI<{ links: ShortLink[] }>('/api/link/list', { query: { limit: 8, sort: 'newest' } }),
    useAPI<{ count: number }>('/api/link/count').catch(() => null),
  ])
  recent.value = list.links ?? []
  totalLinks.value = count?.count ?? recent.value.length
  if (recent.value.length) {
    const res = await useAPI<{ data?: (CounterData & { id: string })[] }>('/api/stats/counters', {
      query: { id: recent.value.map(l => l.id).join(',') },
    }).catch(() => null)
    recentCounters.value = Object.fromEntries((res?.data ?? []).map(c => [c.id, c]))
  }
}

function loadAll() {
  loadRecent().catch(console.error)
  loadStats().catch(console.error)
}

async function login() {
  if (!password.value || loggingIn.value)
    return
  loggingIn.value = true
  loginError.value = ''
  try {
    setAuthToken(password.value)
    await $fetch('/api/verify', { headers: { Authorization: `Bearer ${password.value}` } })
    authState.value = 'in'
    password.value = ''
    loadAll()
  }
  catch {
    removeAuthToken()
    loginError.value = 'Senha incorreta.'
  }
  finally {
    loggingIn.value = false
  }
}

async function shorten() {
  if (creating.value)
    return
  let target = url.value.trim()
  if (!target)
    return
  if (!/^https?:\/\//i.test(target))
    target = `https://${target}`
  creating.value = true
  showQR.value = false
  try {
    const res = await useAPI<{ link: ShortLink, shortLink: string }>('/api/link/create', {
      method: 'POST',
      body: { url: target, slug: slug.value.trim() || randomSlug() },
    })
    created.value = { shortLink: res.shortLink, url: res.link.url }
    url.value = ''
    slug.value = ''
    await copyLink(res.shortLink, 'created')
    loadRecent().catch(console.error)
  }
  catch (error: unknown) {
    const status = (error as { status?: number })?.status
    toast.error(status === 409 ? 'Esse apelido já está em uso. Escolha outro.' : 'Não foi possível encurtar. Confira o link.')
  }
  finally {
    creating.value = false
  }
}

onMounted(async () => {
  if (!getAuthToken()) {
    authState.value = 'out'
    return
  }
  try {
    await $fetch('/api/verify', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
    authState.value = 'in'
    loadAll()
  }
  catch {
    authState.value = 'out'
  }
})

const statCards = computed(() => [
  { label: 'Cliques hoje', hint: 'últimas 24h', value: stats.value.day },
  { label: 'Cliques na semana', hint: 'últimos 7 dias', value: stats.value.week },
  { label: 'Visitantes únicos', hint: 'últimos 7 dias', value: stats.value.weekVisitors },
  { label: 'Links criados', hint: `${stats.value.all.toLocaleString('pt-BR')} cliques no total`, value: totalLinks.value ?? 0 },
])
</script>

<template>
  <div
    class="
      mx-auto w-full max-w-5xl px-4 pb-12
      sm:px-6
    "
  >
    <!-- Hero -->
    <section
      class="
        pt-6 pb-8 text-center
        sm:pt-12
      "
    >
      <p
        class="
          mb-3 text-xs font-semibold tracking-[0.3em] text-primary uppercase
        "
      >
        Encurtador oficial
      </p>
      <h1
        class="
          font-display text-5xl leading-[0.95]
          sm:text-7xl
        "
      >
        Links curtos.<br><span class="text-primary">Foco total.</span>
      </h1>
      <p
        class="
          mx-auto mt-4 max-w-md text-sm text-muted-foreground
          sm:text-base
        "
      >
        Encurte, compartilhe e acompanhe cada clique dos links do Modo Caverna.
      </p>
    </section>

    <!-- Checking -->
    <div v-if="authState === 'checking'" class="flex justify-center py-10">
      <Loader2
        class="
          size-6 text-muted-foreground
          motion-safe:animate-spin
        "
      />
    </div>

    <!-- Login -->
    <section v-else-if="authState === 'out'" class="mx-auto max-w-md">
      <form
        class="rounded-2xl border bg-card/80 p-6 shadow-2xl backdrop-blur-sm" @submit.prevent="login"
      >
        <div class="mb-4 flex items-center gap-2 text-sm font-medium">
          <Lock class="size-4 text-primary" aria-hidden="true" />
          Acesso restrito à equipe
        </div>
        <label for="mc-pass" class="sr-only">Senha de acesso</label>
        <Input
          id="mc-pass"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Senha de acesso"
          class="h-12 text-base"
        />
        <p v-if="loginError" class="mt-2 text-sm text-destructive">
          {{ loginError }}
        </p>
        <Button type="submit" class="mt-4 h-12 w-full text-base font-semibold" :disabled="loggingIn">
          <Loader2 v-if="loggingIn" class="motion-safe:animate-spin" aria-hidden="true" />
          Entrar
        </Button>
      </form>
    </section>

    <template v-else>
      <!-- Shortener -->
      <section
        class="
          rounded-2xl border bg-card/80 p-4 shadow-2xl backdrop-blur-sm
          sm:p-6
        "
      >
        <form class="flex flex-col gap-3" @submit.prevent="shorten">
          <div
            class="
              flex flex-col gap-3
              sm:flex-row
            "
          >
            <div class="relative flex-1">
              <Link2
                class="
                  pointer-events-none absolute top-1/2 left-4 size-5
                  -translate-y-1/2 text-muted-foreground
                " aria-hidden="true"
              />
              <label for="mc-url" class="sr-only">Link longo</label>
              <Input
                id="mc-url"
                v-model="url"
                type="text"
                inputmode="url"
                autocomplete="off"
                placeholder="Cole o link longo aqui"
                class="h-14 pl-12 text-base"
              />
            </div>
            <Button
              type="submit" class="
                font-display h-14 px-8 text-2xl tracking-wide
              " :disabled="creating || !url.trim()"
            >
              <Loader2 v-if="creating" class="motion-safe:animate-spin" aria-hidden="true" />
              <Scissors v-else class="size-5" aria-hidden="true" />
              Encurtar
            </Button>
          </div>
          <div
            class="
              flex items-center overflow-hidden rounded-lg border
              bg-background/60 text-sm
            "
          >
            <span class="shrink-0 border-r px-3 py-2.5 text-muted-foreground">{{ host }}/</span>
            <label for="mc-slug" class="sr-only">Apelido personalizado</label>
            <input
              id="mc-slug"
              v-model="slug"
              type="text"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              placeholder="apelido-opcional"
              class="
                min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none
                placeholder:text-muted-foreground/60
              "
            >
          </div>
        </form>

        <!-- Result -->
        <div
          v-if="created" class="
            mt-4 rounded-xl border border-primary/40 bg-primary/10 p-4
          "
        >
          <div
            class="
              flex flex-col gap-3
              sm:flex-row sm:items-center
            "
          >
            <div class="min-w-0 flex-1">
              <a
                :href="created.shortLink" target="_blank" rel="noopener" class="
                  block truncate text-lg font-semibold text-primary
                  hover:underline
                "
              >
                {{ created.shortLink.replace(/^https?:\/\//, '') }}
              </a>
              <p class="truncate text-xs text-muted-foreground">
                {{ created.url }}
              </p>
            </div>
            <div class="flex gap-2">
              <Button size="sm" @click="copyLink(created.shortLink, 'created')">
                <Check v-if="copiedKey === 'created'" aria-hidden="true" />
                <Copy v-else aria-hidden="true" />
                Copiar
              </Button>
              <Button size="sm" variant="outline" @click="showQR = !showQR">
                <QrCode aria-hidden="true" />
                QR
              </Button>
            </div>
          </div>
          <div
            v-if="showQR" class="
              mt-4 flex justify-center rounded-lg bg-white p-2
            "
          >
            <DashboardLinksQRCode :data="created.shortLink" image="/mc-icon.png" />
          </div>
        </div>
      </section>

      <!-- Stats -->
      <section
        class="
          mt-6 grid grid-cols-2 gap-3
          lg:grid-cols-4
        "
      >
        <div
          v-for="card in statCards" :key="card.label" class="
            rounded-xl border bg-card/70 p-4
          "
        >
          <p class="text-xs text-muted-foreground">
            {{ card.label }}
          </p>
          <p class="font-display mt-1 text-4xl tabular-nums">
            <span v-if="statsLoaded || card.label === 'Links criados'">{{ card.value.toLocaleString('pt-BR') }}</span>
            <span v-else class="text-muted-foreground">–</span>
          </p>
          <p class="text-[11px] text-muted-foreground">
            {{ card.hint }}
          </p>
        </div>
      </section>

      <!-- Lists -->
      <section
        class="
          mt-6 grid gap-6
          lg:grid-cols-5
        "
      >
        <div
          class="
            rounded-xl border bg-card/70
            lg:col-span-3
          "
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2 class="font-display text-2xl">
              Últimos links
            </h2>
            <NuxtLink
              to="/dashboard/links" class="
                flex items-center gap-1 text-xs text-primary
                hover:underline
              "
            >
              Ver todos <ArrowRight class="size-3" aria-hidden="true" />
            </NuxtLink>
          </div>
          <ul v-if="recent.length" class="divide-y">
            <li
              v-for="link in recent" :key="link.id" class="
                flex items-center gap-3 px-4 py-3
              "
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  /{{ link.slug }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ hostOf(link.url) }}
                </p>
              </div>
              <span
                class="
                  shrink-0 text-right text-xs text-muted-foreground tabular-nums
                "
              >
                <strong class="block text-sm text-foreground">{{ Number(recentCounters[link.id]?.visits ?? 0).toLocaleString('pt-BR') }}</strong>
                cliques
              </span>
              <Button size="icon" variant="ghost" :aria-label="`Copiar /${link.slug}`" @click="copyLink(link.slug)">
                <Check v-if="copiedKey === link.slug" class="text-primary" aria-hidden="true" />
                <Copy v-else aria-hidden="true" />
              </Button>
              <Button size="icon" variant="ghost" as-child>
                <NuxtLink :to="`/dashboard/link?slug=${encodeURIComponent(link.slug)}`" :aria-label="`Métricas de /${link.slug}`">
                  <BarChart3 aria-hidden="true" />
                </NuxtLink>
              </Button>
            </li>
          </ul>
          <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum link ainda. Encurte o primeiro aí em cima.
          </p>
        </div>

        <div
          class="
            rounded-xl border bg-card/70
            lg:col-span-2
          "
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2 class="font-display text-2xl">
              Top da semana
            </h2>
            <ListOrdered class="size-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <ol v-if="topLinks.length" class="divide-y">
            <li
              v-for="(item, i) in topLinks" :key="item.name" class="
                flex items-center gap-3 px-4 py-3
              "
            >
              <span class="font-display text-2xl text-primary">{{ i + 1 }}</span>
              <span class="min-w-0 flex-1 truncate text-sm">/{{ item.name }}</span>
              <span class="text-sm font-semibold tabular-nums">{{ Number(item.count).toLocaleString('pt-BR') }}</span>
            </li>
          </ol>
          <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground">
            Sem cliques nos últimos 7 dias.
          </p>
          <div class="border-t p-3">
            <Button as-child variant="outline" class="w-full">
              <NuxtLink to="/dashboard/analysis">
                <BarChart3 aria-hidden="true" />
                Métricas completas
                <ExternalLink class="ml-auto size-3.5 opacity-60" aria-hidden="true" />
              </NuxtLink>
            </Button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
