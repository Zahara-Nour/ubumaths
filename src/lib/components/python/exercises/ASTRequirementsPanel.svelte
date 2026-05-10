<script lang="ts">
	/**
	 * Editor for the `ast_requirements` array of a python exercise validation
	 * config. Receives `requirements` as a regular prop and notifies the
	 * parent of every change via the `onchange` callback (no `$bindable`).
	 *
	 * Each requirement has a type, an optional `name` (for
	 * `defines_function`/`defines_class`/`uses_import`), and a
	 * student-facing error message.
	 *
	 * The parent component owns the wrapper layout (panel header, enable
	 * toggle, etc.) — this component only renders the list of requirements
	 * and the "Add" / "Remove" controls.
	 */

	import type { ASTRequirement, ASTRequirementType } from '$lib/shared/python';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, Trash2 } from 'lucide-svelte';

	type Props = {
		requirements: ASTRequirement[];
		onchange: (next: ASTRequirement[]) => void;
	};

	let { requirements, onchange }: Props = $props();

	const astTypeItems: { value: ASTRequirementType; label: string }[] = [
		{ value: 'uses_loop', label: 'Utilise une boucle (for/while)' },
		{ value: 'defines_function', label: 'Définit une fonction' },
		{ value: 'no_print', label: 'Pas de print()' },
		{ value: 'uses_recursion', label: 'Utilise la récursion' },
		{ value: 'defines_class', label: 'Définit une classe' },
		{ value: 'uses_list_comprehension', label: 'Utilise une compréhension de liste' },
		{ value: 'no_global_variables', label: 'Pas de variables globales' },
		{ value: 'uses_import', label: 'Importe un module' }
	];

	function defaultMessageFor(type: ASTRequirementType, name?: string): string {
		switch (type) {
			case 'uses_loop':
				return 'Tu dois utiliser une boucle';
			case 'defines_function':
				return name ? `Définis la fonction \`${name}\`` : 'Tu dois définir une fonction';
			case 'no_print':
				return "N'utilise pas print()";
			case 'uses_recursion':
				return 'Ta fonction doit être récursive';
			case 'defines_class':
				return name ? `Définis la classe \`${name}\`` : 'Tu dois définir une classe';
			case 'uses_list_comprehension':
				return 'Utilise une compréhension de liste';
			case 'no_global_variables':
				return "N'utilise pas de variables globales";
			case 'uses_import':
				return name ? `Importe le module \`${name}\`` : 'Tu dois importer un module';
		}
	}

	function astSupportsName(type: ASTRequirementType): boolean {
		return type === 'defines_function' || type === 'defines_class' || type === 'uses_import';
	}

	function addRequirement() {
		onchange([...requirements, { type: 'uses_loop', message: defaultMessageFor('uses_loop') }]);
	}

	function removeRequirement(i: number) {
		if (requirements.length <= 1) return;
		onchange(requirements.filter((_, idx) => idx !== i));
	}

	function setRequirementType(i: number, type: ASTRequirementType) {
		const updated = [...requirements];
		const current = updated[i];
		updated[i] = {
			type,
			name: astSupportsName(type) ? current.name : undefined,
			message: defaultMessageFor(type, current.name)
		};
		onchange(updated);
	}

	function updateName(i: number, name: string) {
		const updated = [...requirements];
		updated[i] = { ...updated[i], name };
		onchange(updated);
	}

	function updateMessage(i: number, message: string) {
		const updated = [...requirements];
		updated[i] = { ...updated[i], message };
		onchange(updated);
	}
</script>

<div class="space-y-2">
	{#each requirements as req, i (i)}
		<div class="rounded-md border border-border p-3">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium">Exigence {i + 1}</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => removeRequirement(i)}
					disabled={requirements.length <= 1}
					aria-label="Supprimer l'exigence {i + 1}"
				>
					<Trash2 class="h-4 w-4" />
				</Button>
			</div>
			<div class="space-y-2">
				<div>
					<label class="mb-1 block text-xs text-muted-foreground" for="ast-type-{i}">Type</label>
					<MySelect
						id="ast-type-{i}"
						items={astTypeItems}
						value={req.type}
						onchange={(v) => setRequirementType(i, v as ASTRequirementType)}
					/>
				</div>
				{#if astSupportsName(req.type)}
					<div>
						<label class="mb-1 block text-xs text-muted-foreground" for="ast-name-{i}">
							Nom (optionnel) — ex&nbsp;: <code>factorielle</code>
						</label>
						<Input
							id="ast-name-{i}"
							value={req.name ?? ''}
							oninput={(e) => updateName(i, (e.target as HTMLInputElement).value)}
							placeholder="laisser vide pour accepter n'importe quel nom"
							autocomplete="off"
						/>
					</div>
				{/if}
				<div>
					<label class="mb-1 block text-xs text-muted-foreground" for="ast-msg-{i}">
						Message d'erreur affiché à l'élève
					</label>
					<Input
						id="ast-msg-{i}"
						value={req.message}
						oninput={(e) => updateMessage(i, (e.target as HTMLInputElement).value)}
						autocomplete="off"
					/>
				</div>
			</div>
		</div>
	{/each}
	<Button type="button" variant="outline" size="sm" onclick={addRequirement}>
		<Plus class="mr-1 h-4 w-4" /> Ajouter une exigence
	</Button>
</div>
