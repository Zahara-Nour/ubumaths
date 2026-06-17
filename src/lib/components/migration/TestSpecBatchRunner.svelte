<!--
	TestSpec Batch Runner
	=====================

	Runs all test specs for a set of question templates.
	Shows progress and summary results.

	PROPS:
	- open: boolean (bindable)
	- templates: QuestionTemplate[] (with testSpecs)
-->

<script lang="ts">
	import type { QuestionTemplate } from '$lib/questions/types';
	import type { TestSpecResult } from '$lib/questions/test-spec-runner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Check, X, Play, ChevronDown } from '@lucide/svelte';

	interface Props {
		open: boolean;
		templates: QuestionTemplate[];
	}

	let { open = $bindable(), templates }: Props = $props();

	interface TemplateResults {
		template: QuestionTemplate;
		results: TestSpecResult[];
		expanded: boolean;
	}

	let templateResults = $state<TemplateResults[]>([]);
	let isRunning = $state(false);
	let progress = $state(0);

	let totalSpecs = $derived(templates.reduce((sum, t) => sum + (t.testSpecs?.length ?? 0), 0));
	let totalPassed = $derived(
		templateResults.reduce((sum, tr) => sum + tr.results.filter((r) => r.passed).length, 0)
	);
	let totalFailed = $derived(
		templateResults.reduce((sum, tr) => sum + tr.results.filter((r) => !r.passed).length, 0)
	);
	let totalRun = $derived(totalPassed + totalFailed);

	async function runAll() {
		isRunning = true;
		progress = 0;
		templateResults = [];

		try {
			const { runAllTestSpecs } = await import('$lib/questions/test-spec-runner');

			const filteredTemplates = templates.filter((t) => t.testSpecs && t.testSpecs.length > 0);

			for (let i = 0; i < filteredTemplates.length; i++) {
				const template = filteredTemplates[i];
				const results = runAllTestSpecs(template);
				const hasFailed = results.some((r) => !r.passed);

				templateResults = [...templateResults, { template, results, expanded: hasFailed }];

				progress = ((i + 1) / filteredTemplates.length) * 100;

				// Yield to UI between batches
				if (i % 5 === 4) {
					await new Promise((resolve) => setTimeout(resolve, 0));
				}
			}
		} finally {
			isRunning = false;
		}
	}

	function toggleExpand(index: number) {
		templateResults[index].expanded = !templateResults[index].expanded;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Lancer tous les tests</Dialog.Title>
			<Dialog.Description>
				{totalSpecs} test(s) sur {templates.filter((t) => t.testSpecs?.length).length} question(s)
			</Dialog.Description>
		</Dialog.Header>

		<!-- Summary -->
		{#if totalRun > 0}
			<div class="mb-4 flex gap-4 text-sm">
				<Badge variant="outline" class="gap-1">
					Total: {totalRun}
				</Badge>
				<Badge variant="default" class="gap-1 bg-green-600">
					<Check class="h-3 w-3" />
					{totalPassed}
				</Badge>
				{#if totalFailed > 0}
					<Badge variant="destructive" class="gap-1">
						<X class="h-3 w-3" />
						{totalFailed}
					</Badge>
				{/if}
			</div>
		{/if}

		<!-- Progress bar -->
		{#if isRunning}
			<div class="mb-4 h-2 w-full rounded-full bg-muted">
				<div class="h-2 rounded-full bg-primary transition-all" style="width: {progress}%"></div>
			</div>
		{/if}

		<!-- Results -->
		<div class="max-h-[50vh] space-y-1 overflow-y-auto">
			{#each templateResults as tr, i (tr.template.id)}
				{@const passed = tr.results.filter((r) => r.passed).length}
				{@const failed = tr.results.filter((r) => !r.passed).length}
				<div class="rounded border">
					<button
						class="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-muted/50"
						onclick={() => toggleExpand(i)}
					>
						<div class="flex min-w-0 flex-1 items-center gap-2">
							{#if failed > 0}
								<X class="h-4 w-4 shrink-0 text-red-600" />
							{:else}
								<Check class="h-4 w-4 shrink-0 text-green-600" />
							{/if}
							<span class="truncate">{tr.template.title}</span>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<span class="text-xs text-muted-foreground">{passed}/{tr.results.length}</span>
							<ChevronDown class="h-3 w-3 transition-transform {tr.expanded ? 'rotate-180' : ''}" />
						</div>
					</button>

					{#if tr.expanded}
						<div class="divide-y border-t">
							{#each tr.results as result, j (result.spec.description + j)}
								<div class="flex items-center gap-2 px-4 py-1.5 text-xs">
									{#if result.passed}
										<Check class="h-3 w-3 shrink-0 text-green-600" />
									{:else}
										<X class="h-3 w-3 shrink-0 text-red-600" />
									{/if}
									<span class="flex-1">{result.spec.description}</span>
									{#if !result.passed}
										<span class="text-red-600">
											{#if result.error}
												{result.error}
											{:else}
												attendu: {result.spec.expected.status}, obtenu: {result.actual.status}
											{/if}
										</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<Dialog.Footer>
			<Button onclick={runAll} disabled={isRunning || totalSpecs === 0}>
				<Play class="mr-1 h-4 w-4" />
				{isRunning ? 'En cours...' : 'Lancer'}
			</Button>
			<Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
