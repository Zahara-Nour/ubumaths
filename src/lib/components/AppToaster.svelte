<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import { mobileStore } from '#lib/stores/mobile.svelte.ts';

	// Au téléphone, une seule annonce visible à la fois (la plus récente) :
	// empilées en `expand`, elles couvrent la moitié de l'écran.
	// gap = espace entre annonces (évite le chevauchement), offset = marge au bord de l'écran.
	const visibleToasts = $derived(mobileStore.isMobile ? 1 : 5);
	const expand = $derived(!mobileStore.isMobile);
</script>

<Toaster richColors position="top-right" {expand} {visibleToasts} gap={12} offset="16px" />
