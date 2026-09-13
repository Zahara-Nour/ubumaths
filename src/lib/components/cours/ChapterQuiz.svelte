<!--
	ChapterQuiz Component
	=====================

	Quiz d'un chapitre : les questions du moteur de questions, résolues aux
	valeurs de l'élève par le serveur, rendues et corrigées par `FlashCard`.

	Ce composant était câblé en vrai/faux (`answer: boolean`) contre des
	modèles qui n'ont jamais porté de colonne `answer` : il n'a donc jamais rien
	affiché. Il s'appuie désormais sur le même moteur que /automaths et le SRS,
	et sur `chapter_quiz_questions.question_template_id`, qui faisait déjà le
	lien.

	Deux choix qui ne se voient pas dans le code :

	- **Ce qui n'est pas jouable est annoncé.** L'ancienne version filtrait en
	  silence (`questions.filter(...)`), ce qui a transformé un bug permanent en
	  « quiz vide ». Le serveur dit maintenant ce qu'il a écarté, et on l'affiche.
	- **Un échec d'enregistrement se voit.** Il était avalé par un
	  `// Continue anyway` : l'élève croyait sa réponse comptée.

	@module components/cours/ChapterQuiz
-->
<script lang="ts">
	import type {
		ChapterQuizQuestion,
		ChapterQuizResult,
		QuizUnavailableQuestion
	} from '$lib/types/chapters';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData } from '$lib/types/question-display';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { cn } from '$lib/utils';
	import { ChevronRight, ChevronLeft, AlertTriangle } from '@lucide/svelte';

	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import QuizSummary from './QuizSummary.svelte';

	type QuizQuestionWithResult = ChapterQuizQuestion & {
		bestResult: ChapterQuizResult | null;
		attemptsCount: number;
	};

	interface Props {
		/** Chapitre courant — il porte la route de soumission. */
		chapterId: string;
		questions: QuizQuestionWithResult[];
		/** Instances résolues par le serveur, indexées par id de question de quiz. */
		instances: Record<string, QuestionInstance>;
		/** Questions écartées, avec leur motif. Affichées, jamais tues. */
		unavailable?: QuizUnavailableQuestion[];
		onComplete?: (score: number, total: number) => void;
	}

	let { chapterId, questions, instances, unavailable = [], onComplete }: Props = $props();

	// Seules les questions que le serveur a su résoudre sont jouables ; les
	// autres sont comptées à part et annoncées.
	const playableQuestions = $derived(questions.filter((q) => instances[q.id]));

	// Le motif compte : « pas encore publié » se répare en publiant, « modèle
	// défectueux » non. Dire la mauvaise cause, c'est envoyer l'élève et le
	// professeur chercher au mauvais endroit — le défaut même qu'on corrige ici.
	const defectueuses = $derived(
		unavailable.filter((u) => u.reason === 'generation_impossible').length
	);
	const nonPubliees = $derived(unavailable.length - defectueuses);

	// Quiz state
	//
	// Les réponses sont indexées par question, pas par rang : un tableau aligné
	// sur l'index obligeait à le ré-initialiser dans un `$effect` dès que la
	// liste changeait, et un décalage d'index aurait colorié la mauvaise pastille.
	//
	// `answers` est la SEULE source : le score et « cette question est répondue »
	// en dérivent. Les tenir à part laissait le score se désynchroniser — un
	// retour en arrière le comptait deux fois.
	let rawIndex = $state(0);
	let answers = $state<Record<string, boolean>>({});
	let isComplete = $state(false);

	// Derived values
	const totalQuestions = $derived(playableQuestions.length);
	// L'index est borné : si la liste rétrécit sous nos pieds (un modèle
	// dépublié, un `load` rejoué), un index périmé afficherait une carte vide
	// sans bouton pour en sortir — le cul-de-sac muet que ce quiz doit bannir.
	const currentIndex = $derived(Math.min(rawIndex, Math.max(0, totalQuestions - 1)));
	const currentQuestion = $derived(playableQuestions[currentIndex]);
	const currentInstance = $derived(currentQuestion ? instances[currentQuestion.id] : null);
	const answered = $derived(currentQuestion ? answers[currentQuestion.id] !== undefined : false);
	const score = $derived(Object.values(answers).filter(Boolean).length);
	const progressPercent = $derived(
		totalQuestions === 0
			? 0
			: Math.round(((currentIndex + (answered ? 1 : 0)) / totalQuestions) * 100)
	);
	const hasNextQuestion = $derived(currentIndex < totalQuestions - 1);
	// Revoir une question déjà traitée est permis ; y répondre à nouveau ne l'est
	// pas (la carte passe en lecture seule).
	const canGoBack = $derived(currentIndex > 0);

	/**
	 * La correction vient de `FlashCard`, qui a validé la réponse avec le même
	 * validateur que /automaths. On n'a plus à comparer quoi que ce soit ici.
	 */
	async function handleAnswer(answer: AnswerData) {
		// Une question ne se répond qu'une fois. Sans ce garde, un aller-retour
		// remonte la carte, l'élève revalide, le score double et le serveur
		// ré-attribue de l'XP à chaque passage.
		if (!currentQuestion || answers[currentQuestion.id] !== undefined) return;

		answers[currentQuestion.id] = answer.isCorrect;

		await submitAnswer(currentQuestion.id, answer);
	}

	async function submitAnswer(quizQuestionId: string, answer: AnswerData) {
		try {
			const response = await fetch(`/api/student/chapters/${chapterId}/quiz/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					quizQuestionId,
					isCorrect: answer.isCorrect,
					// Le serveur exige un entier de secondes, borné à 24 h.
					timeSpentSeconds: Math.max(0, Math.min(86400, Math.round(answer.timeSpent))),
					submittedAnswer: formatAnswer(answer.value)
				})
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);
		} catch (err) {
			// L'élève vient de travailler : lui laisser croire que c'est compté
			// serait pire que de le lui dire.
			console.error('Enregistrement de la réponse impossible :', err);
			toaster.error('Réponse non enregistrée — elle ne comptera pas dans ton suivi.');
		}
	}

	/** `submitted_answer` est une colonne texte : un tableau de blancs y tient. */
	function formatAnswer(value: AnswerData['value']): string {
		const texte = Array.isArray(value) ? value.join(' ; ') : String(value ?? '');
		return texte.slice(0, 5000);
	}

	function nextQuestion() {
		if (!answered) return;

		if (hasNextQuestion) {
			rawIndex = currentIndex + 1;
		} else {
			isComplete = true;
			onComplete?.(score, totalQuestions);
		}
	}

	function previousQuestion() {
		if (!canGoBack) return;
		rawIndex = currentIndex - 1;
	}

	function restart() {
		rawIndex = 0;
		answers = {};
		isComplete = false;
	}
</script>

<div class="chapter-quiz mx-auto max-w-2xl">
	{#if unavailable.length > 0}
		<!--
			Dire pourquoi le quiz est incomplet. Sans ça, l'élève voit un quiz plus
			court sans savoir qu'il l'est, et le professeur ne sait pas qu'il doit
			publier ses modèles.
		-->
		<div
			class="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm dark:bg-amber-900/20"
			role="status"
		>
			<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
			<p>
				{unavailable.length}
				{unavailable.length > 1 ? 'questions ne sont pas' : "question n'est pas"} disponible{unavailable.length >
				1
					? 's'
					: ''} pour le moment.
				{#if nonPubliees > 0 && defectueuses > 0}
					Certaines ne sont pas encore publiées, d'autres sont défectueuses : signale-le à ton
					professeur.
				{:else if defectueuses > 0}
					{defectueuses > 1 ? 'Elles sont défectueuses' : 'Elle est défectueuse'} : signale-le à ton
					professeur.
				{:else}
					Ton professeur doit {unavailable.length > 1
						? 'publier les modèles correspondants'
						: 'publier le modèle correspondant'}.
				{/if}
			</p>
		</div>
	{/if}

	{#if totalQuestions === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p>Aucune question jouable dans ce quiz pour l'instant.</p>
			</Card.Content>
		</Card.Root>
	{:else if isComplete}
		<QuizSummary {score} total={totalQuestions} onRestart={restart} onClose={restart} />
	{:else}
		<Card.Root>
			<Card.Header>
				<div class="space-y-3">
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>Question {currentIndex + 1} / {totalQuestions}</span>
						<span>{progressPercent}%</span>
					</div>
					<Progress value={progressPercent} max={100} class="h-2" />
				</div>
			</Card.Header>

			<Card.Content class="space-y-3 pt-2">
				{#if currentInstance}
					{#if answered}
						<!--
							Le `{#key}` remonte la carte à chaque changement de question :
							elle revient donc vierge. Sans ce rappel, l'élève qui revient
							croirait n'avoir jamais répondu — et chercherait à répondre encore.
						-->
						<p class="text-sm text-muted-foreground">
							{answers[currentQuestion.id]
								? 'Tu as déjà répondu juste à cette question.'
								: 'Tu as déjà répondu à cette question, et la réponse était fausse.'}
						</p>
					{/if}
					<!--
						`{#key}` : sans lui, passer à la question suivante réutiliserait
						l'état interne de la carte (réponse saisie, statut de validation).

						`interactive` est coupé sur une question déjà traitée : la carte
						remontée redonnerait sinon un bouton « Valider », et chaque
						re-validation comptait un second point et refarmait de l'XP.
					-->
					{#key currentQuestion.id}
						<FlashCard
							interactive={!answered}
							instance={currentInstance}
							size="lg"
							maxAttempts={1}
							showCorrectionOnWrong={true}
							onAnswerSubmit={handleAnswer}
						/>
					{/key}
				{:else}
					<!-- Ni carte ni explication, ce serait le cul-de-sac muet d'avant. -->
					<p class="py-8 text-center text-muted-foreground">
						Cette question ne peut pas être affichée. Passe à la suivante.
					</p>
				{/if}
			</Card.Content>

			<Card.Footer class="flex justify-between">
				<div>
					{#if canGoBack}
						<Button variant="ghost" onclick={previousQuestion}>
							<ChevronLeft class="mr-1 h-4 w-4" />
							Précédent
						</Button>
					{/if}
				</div>

				<div>
					{#if answered}
						<Button onclick={nextQuestion} size="lg">
							{#if hasNextQuestion}
								Suivant
							{:else}
								Voir le résultat
							{/if}
							<ChevronRight class="ml-1 h-4 w-4" />
						</Button>
					{/if}
				</div>
			</Card.Footer>
		</Card.Root>

		<!-- Question dots indicator -->
		<div class="mt-4 flex justify-center gap-2">
			{#each playableQuestions as question, index (question.id)}
				{@const isAnswered = answers[question.id] !== undefined}
				{@const isCurrent = index === currentIndex}
				{@const wasCorrect = answers[question.id] === true}
				<button
					class={cn(
						'h-3 w-3 rounded-full transition-all',
						isCurrent && 'ring-2 ring-primary ring-offset-2',
						!isAnswered && 'bg-muted',
						isAnswered && wasCorrect && 'bg-green-500',
						isAnswered && !wasCorrect && 'bg-red-500'
					)}
					onclick={() => {
						if (index <= currentIndex) {
							rawIndex = index;
						}
					}}
					disabled={index > currentIndex}
					aria-label={`Question ${index + 1}${isAnswered ? (wasCorrect ? ' - correcte' : ' - incorrecte') : ''}`}
				></button>
			{/each}
		</div>
	{/if}
</div>
