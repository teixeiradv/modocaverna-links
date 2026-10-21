<script setup lang="ts">
import { Scissors } from '@lucide/vue'
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child tooltip="Encurtar link">
            <NuxtLink to="/">
              <Scissors aria-hidden="true" />
              <span>Encurtar link</span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
