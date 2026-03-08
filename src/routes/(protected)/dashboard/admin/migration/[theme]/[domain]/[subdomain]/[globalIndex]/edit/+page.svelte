<!--
	Migration Question Edit Page
	============================

	Admin page for editing a migrated question using QuestionTemplateForm.
	Saves edits to migration_edits via the existing API endpoint.
	Navigates back to the subdomain review page on save/cancel.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { ArrowLeft, Home, Loader2, RotateCcw } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	let isSubmitting = $state(false);
	let isReexporting = $state(false);
	let QuestionTemplateForm = $state<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
	let isLoading = $state(true);
	let templateOverride = $state<typeof data.template | null>(null);
	let templateData = $derived(templateOverride ?? data.template);

	const backUrl = $derived(
		`/dashboard/admin/migration/${data.pathParams.theme}/${data.pathParams.domain}/${data.pathParams.subdomain}`
	);

	// Dynamically import QuestionTemplateForm to reduce initial bundle size
	onMount(async () => {
		const module = await import('$lib/components/QuestionTemplateForm.svelte');
		QuestionTemplateForm = module.default;
		isLoading = false;
	});

	async function handleSave(
		template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
		options?: { silent?: boolean }
	) {
		isSubmitting = true;

		try {
			const response = await fetch(`/api/migration/questions/${data.globalIndex}/edit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ editedTransformed: template })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Erreur lors de l'enregistrement");
			}

			toaster.success(`Question #${data.globalIndex} modifiée`);
			if (!options?.silent) {
				void goto(backUrl);
			}
		} catch (err) {
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		void goto(backUrl);
	}

	async function handleReexport() {
		if (!confirm("Ré-exporter depuis l'original ? Les modifications en cours seront perdues.")) {
			return;
		}
		isReexporting = true;
		try {
			const response = await fetch(`/api/migration/questions/${data.globalIndex}`);
			if (!response.ok) {
				throw new Error('Erreur lors du chargement');
			}
			const result = await response.json();
			if (!result.success || !result.data.transformed?.template) {
				throw new Error(result.data.transformError || 'Transformation échouée');
			}
			const t = result.data.transformed.template;
			// Rebuild template with correct category metadata (same as +page.server.ts)
			templateOverride = {
				id: `migration-${data.globalIndex}`,
				title: t.title || '',
				description: t.description,
				shared: t.shared,
				defaultDisplayOptions: t.defaultDisplayOptions,
				multipleAnswers: t.multipleAnswers,
				variations: t.variations || [],
				exerciseInstruction: t.exerciseInstruction,
				options: t.options,
				grades: t.grades || [],
				theme: data.theme,
				domain: data.domain,
				subdomain: data.subdomain,
				level: data.template.level,
				status: t.status || 'draft',
				delay: t.delay
			};
			toaster.success("Question ré-exportée depuis l'original");
		} catch (err) {
			toaster.error(err instanceof Error ? err.message : 'Erreur de ré-export');
		} finally {
			isReexporting = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier Question #{data.globalIndex} - Migration</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-6 p-6">
	<!-- Breadcrumb -->
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/admin">
					<Home class="h-4 w-4" />
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/admin/migration">Migration</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href={backUrl}>{data.subdomain}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>Question #{data.globalIndex}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" onclick={handleCancel} class="gap-2">
				<ArrowLeft class="h-4 w-4" />
				Retour
			</Button>
			<div>
				<h1 class="text-3xl font-bold">Modifier Question #{data.globalIndex}</h1>
				<p class="text-muted-foreground">
					{data.theme} &rsaquo; {data.domain} &rsaquo; {data.subdomain}
				</p>
			</div>
		</div>
		<Button
			variant="outline"
			onclick={handleReexport}
			disabled={isReexporting || isSubmitting}
			class="gap-2"
		>
			{#if isReexporting}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<RotateCcw class="h-4 w-4" />
			{/if}
			Ré-exporter
		</Button>
	</div>

	<!-- Main Form -->
	<Card.Root>
		<Card.Content>
			{#if isLoading}
				<div class="flex min-h-[400px] items-center justify-center">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if QuestionTemplateForm}
				{#key templateData}
					<QuestionTemplateForm
						template={templateData}
						onSave={handleSave}
						onCancel={handleCancel}
						{isSubmitting}
					/>
				{/key}
			{/if}
		</Card.Content>
	</Card.Root>
</div>
