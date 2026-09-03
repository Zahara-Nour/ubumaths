<script lang="ts">
	/**
	 * HintTranslationEditor - English text of the hints, alongside the French ones
	 *
	 * Deliberately NOT the French hint editor in another language: `id`, `type`
	 * and `url` are structural and stay owned by the French side — the statement
	 * references hints by id through `{{hint:id}}`, so a translation that could
	 * add, remove or renumber them would break the exercise. Here the French
	 * hints are the fixed frame, and only their text is translatable.
	 *
	 * A hint left untranslated keeps its French text: the resolution falls back
	 * field by field, so a half-translated list is safe.
	 *
	 * @example
	 * <HintTranslationEditor hints={variation.hints} bind:translations={variation.translations} />
	 */

	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		translatedHintField,
		withTranslatedHint,
		type TranslatableHintField
	} from '$lib/exercises/translation-draft';
	import type { ExerciseHint, ExerciseTranslations } from '$lib/exercises/types';

	let {
		hints = [],
		translations = $bindable(),
		onchange
	}: {
		hints?: ExerciseHint[];
		translations?: ExerciseTranslations;
		onchange?: () => void;
	} = $props();

	function set(hintId: string, field: TranslatableHintField, value: string) {
		translations = withTranslatedHint(translations, hintId, field, value);
		onchange?.();
	}

	/** `content` only carries text for inline ubumark hints; the others use `url`. */
	function isInline(hint: ExerciseHint): boolean {
		return hint.type === 'ubumark';
	}
</script>

{#if hints.length === 0}
	<p class="text-sm text-muted-foreground">
		Aucun indice à traduire. Ajoute-les d'abord en français : leurs identifiants et leurs liens
		restent communs aux deux langues.
	</p>
{:else}
	<div class="space-y-4">
		<p class="text-xs text-muted-foreground">
			Seul le texte se traduit. L'identifiant, le type et le lien restent ceux du français — c'est
			ce qui garantit que les références <code>&lbrace;&lbrace;hint:id&rbrace;&rbrace;</code> de l'énoncé
			continuent de fonctionner. Un champ laissé vide sort en français.
		</p>

		{#each hints as hint (hint.id)}
			<div class="space-y-2 rounded-md border border-border p-3">
				<div class="flex items-baseline gap-2">
					<code class="text-xs text-muted-foreground">{hint.id}</code>
					<span class="text-sm text-foreground">{hint.title}</span>
				</div>

				<div class="space-y-1">
					<Label for="hint-en-title-{hint.id}" class="text-xs text-muted-foreground">Titre</Label>
					<Input
						id="hint-en-title-{hint.id}"
						value={translatedHintField(translations, hint.id, 'title')}
						oninput={(e) => set(hint.id, 'title', e.currentTarget.value)}
						placeholder={hint.title}
					/>
				</div>

				{#if hint.description}
					<div class="space-y-1">
						<Label for="hint-en-desc-{hint.id}" class="text-xs text-muted-foreground">
							Description
						</Label>
						<Input
							id="hint-en-desc-{hint.id}"
							value={translatedHintField(translations, hint.id, 'description')}
							oninput={(e) => set(hint.id, 'description', e.currentTarget.value)}
							placeholder={hint.description}
						/>
					</div>
				{/if}

				{#if isInline(hint)}
					<div class="space-y-1">
						<Label for="hint-en-content-{hint.id}" class="text-xs text-muted-foreground">
							Contenu
						</Label>
						<Textarea
							id="hint-en-content-{hint.id}"
							value={translatedHintField(translations, hint.id, 'content')}
							oninput={(e) => set(hint.id, 'content', e.currentTarget.value)}
							rows={3}
							placeholder={hint.content ?? ''}
						/>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
