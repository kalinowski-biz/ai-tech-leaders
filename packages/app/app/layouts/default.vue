<template>
  <div class="min-h-screen bg-white text-slate-900">
    <header class="border-b border-slate-200">
      <nav class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight">TripSalesAgent</NuxtLink>
        <NuxtLink to="/admin" class="text-sm text-slate-600 hover:text-slate-900">Admin</NuxtLink>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-6 py-16">
      <slot />
    </main>
  </div>
</template>
