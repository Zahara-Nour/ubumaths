<!--
	Question d'âge en 2nde (RGPD, article 8)
	========================================

	Fenêtre « As-tu 15 ans ou plus ? » montrée à un élève de 2nde qui n'a pas encore
	répondu. Oui / Non → POST /api/student/age-declaration (seul chemin d'écriture).
	Fermer sans répondre (Échap, clic hors de la fenêtre) n'envoie rien : la question
	revient au prochain chargement de l'espace élève, sans bloquer l'accès.
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { AGE_DECLARATION_ENDPOINT, shouldAskAgeQuestion } from '$lib/utils/age-declaration';

	interface Props {
		role: string | null;
		grade: string | null;
		ageDeclaration: string | null;
		/** Appelé après une réponse enregistrée (ex. recharger les données du layout). */
		onAnswered?: () => void | Promise<void>;
	}

	let { role, grade, ageDeclaration, onAnswered }: Props = $props();

	// Fermée sans réponse pendant cette visite, ou réponse enregistrée.
	let dismissed = $state(false);
	let answered = $state(false);
	let submitting = $state(false);

	const isOpen = $derived(
		shouldAskAgeQuestion({ role, grade, age_declaration: ageDeclaration }) &&
			!dismissed &&
			!answered
	);

	function handleOpenChange(next: boolean) {
		if (!next && !submitting) dismissed = true;
	}

	async function handleAnswer(fifteenOrOlder: boolean) {
		if (submitting) return;
		submitting = true;
		try {
			const response = await fetch(AGE_DECLARATION_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fifteenOrOlder })
			});
			if (response.ok || response.status === 409) {
				// 409 : une réponse existe déjà, inutile de reposer la question.
				answered = true;
			} else {
				toaster.error("Ta réponse n'a pas pu être enregistrée. Réessaie plus tard.");
			}
		} catch (err) {
			console.error('[AgeQuestionDialog] Envoi impossible :', err);
			toaster.error("Ta réponse n'a pas pu être enregistrée. Réessaie plus tard.");
		} finally {
			submitting = false;
		}

		// Hors du try : un échec du rechargement ne doit pas annoncer une réponse perdue.
		if (answered) {
			try {
				await onAnswered?.();
			} catch (err) {
				console.error('[AgeQuestionDialog] Rechargement après réponse impossible :', err);
			}
		}
	}
</script>

<Dialog.Root bind:open={() => isOpen, handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>As-tu 15 ans ou plus ?</Dialog.Title>
			<Dialog.Description>
				Pour respecter la loi, nous devons savoir si l'accord de tes parents est nécessaire.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2 sm:justify-center">
			<Button onclick={() => handleAnswer(true)} disabled={submitting}>Oui</Button>
			<Button variant="outline" onclick={() => handleAnswer(false)} disabled={submitting}>
				Non
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
