<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';
	import TemplateGallery from '$lib/components/notebook/templates/TemplateGallery.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Supabase returns joined profiles as an array; TemplateGallery expects a single Author | null.
	// Flatten by taking the first element of the array (or null if empty).
	const templates = $derived(
		(
			data.templates as unknown as Array<
				(typeof data.templates)[0] & {
					profiles: { firstname: string | null; lastname: string | null }[] | null;
				}
			>
		).map((t) => ({
			...t,
			profiles: Array.isArray(t.profiles) ? (t.profiles[0] ?? null) : t.profiles
		}))
	);

	function handleBack(): void {
		void goto('/dashboard/teacher/contenu/notebooks');
	}
</script>

<svelte:head>
	<title>Templates Python | Chiphre</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" onclick={handleBack} aria-label="Retour aux notebooks">
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h2 class="text-xl font-semibold">Templates Python</h2>
				<p class="text-sm text-muted-foreground">
					Clonez un template pour partir d'un notebook préparé. Vous pouvez aussi créer vos propres
					templates depuis la toolbar d'un notebook.
				</p>
			</div>
		</div>
	</div>

	<TemplateGallery {templates} currentUserId={data.currentUserId} />
</div>
