<!--
	Carte question (`/dev/carte-question`)
	=====================================

	Banc d'essai de `FlashCard` : réglages, état interne, journaux des
	événements. Fusion de l'ancienne page admin `debug/question-display` et de
	la démo `/demo/question-display-demo`, dont trois questions sont reprises
	(la quatrième, `x^2 - 9`, était déjà ici).
-->

<script lang="ts">
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import { getQuestionType } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { resolvedMarkdown } from '$lib/ubumark';
	import { RefreshCw, Copy, Check } from '@lucide/svelte';
	import { browser } from '$app/environment';

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Mode selection
	let interactive = $state<boolean>(true);

	// Component configuration
	let size = $state<'sm' | 'md' | 'lg'>('md');
	let showCorrectionOnWrong = $state(false);
	let maxAttempts = $state(0);

	// Debug logs
	let answerSubmitLog = $state<AnswerData[]>([]);
	let answerChangeLog = $state<string[]>([]);
	let flipLog = $state<{ timestamp: string; isFlipped: boolean }[]>([]);
	let completionStats = $state<QuestionStats | null>(null);

	// Copy feedback
	let copiedSection = $state<string | null>(null);

	// Selected question type for testing
	let selectedQuestionType = $state<string>('numerical_exact');

	// ============================================================================
	// SAMPLE QUESTIONS
	// ============================================================================

	// Debug-only extension: adds `solution` which is not part of QuestionInstance
	// (solution is a legacy field kept only for debug/test fixtures in this page)
	type DebugInstance = Partial<QuestionInstance> &
		Pick<QuestionInstance, 'templateId'> & {
			solution?: string | string[];
			precision?: { type: string; digits?: number };
		};

	// Case « figure » (bloc ```figure-a-completer), telle que le générateur la pose :
	// `case: 0` en tête du bloc, le texte du bloc et ses vérifications dans la case
	const FIGURE_BODY = [
		'fenetre: 0 ; 10 ; 0 ; 6',
		'outils: droite',
		'verifier: droite_par A ; B',
		'---',
		'A = point(1, 2)',
		'B = point(7, 2)',
		'C = point(4, 5)'
	].join('\n');

	// CP-060 : terminer un carré sur quadrillage (outil segment, sommets sans lettre)
	const CARRE_BODY = [
		'fenetre: 0 ; 12 ; 0 ; 8',
		'grille: 1',
		'outils: segment',
		'verifier: carre A ; B',
		'---',
		'A = point(2, 4, visible=faux)',
		'B = point(5, 4, visible=faux)',
		'ab = segment(A, B)'
	].join('\n');

	// CP-058 : point C presque sur la droite (AB), 0,25 carreau au-dessus ; figure de travail
	// (non notée) + case choix Oui / Non
	const ALIGNES_BODY = [
		'fenetre: 0 ; 10 ; 0 ; 6',
		'outils: droite',
		'---',
		'A = point(2, 3)',
		'B = point(8, 5)',
		'C = point(5, 4.25)'
	].join('\n');

	const sampleQuestions: Record<string, DebugInstance> = {
		figure_alignes: {
			templateId: 'demo-figure-alignes',
			statement: resolvedMarkdown(
				`Les points $A$, $B$ et $C$ sont-ils alignés ? Tu peux tracer la droite $(AB)$ pour vérifier.\n\n\`\`\`figure-de-travail\ncase: 0\n${ALIGNES_BODY}\n\`\`\`\n\n\`\`\`choix\ncase: 1\n- Oui\n- Non\n\`\`\``
			),
			blanks: [
				{
					expectedAnswer: '',
					type: 'graphical',
					construction: { source: ALIGNES_BODY, checks: [], work: true }
				},
				{
					expectedAnswer: '1',
					type: 'choice',
					choice: { choices: ['Oui', 'Non'], order: [0, 1], multiple: false }
				}
			],
			grades: ['CP'],
			theme: 'Géométrie',
			domain: 'Points alignés',
			level: 1
		},
		figure_carre: {
			templateId: 'demo-figure-carre',
			statement: resolvedMarkdown(
				`Termine le carré.\n\n\`\`\`figure-a-completer\ncase: 0\n${CARRE_BODY}\n\`\`\``
			),
			blanks: [
				{
					expectedAnswer: 'carre(A;B)',
					type: 'graphical',
					construction: {
						source: CARRE_BODY,
						checks: [{ kind: 'carre', points: ['A', 'B'], line: 4 }]
					}
				}
			],
			grades: ['CP'],
			theme: 'Géométrie',
			domain: 'Terminer un carré',
			level: 1
		},
		figure_a_completer: {
			templateId: 'demo-figure-a-completer',
			statement: resolvedMarkdown(
				`Trace la droite qui passe par les points A et B.\n\n\`\`\`figure-a-completer\ncase: 0\n${FIGURE_BODY}\n\`\`\``
			),
			blanks: [
				{
					expectedAnswer: 'droite(A;B)',
					type: 'graphical',
					construction: {
						source: FIGURE_BODY,
						checks: [{ kind: 'droite_par', points: ['A', 'B'], line: 3 }]
					}
				}
			],
			grades: ['CP'],
			theme: 'Géométrie',
			domain: 'Tracer une droite',
			level: 1
		},
		numerical_exact: {
			templateId: 'debug-numerical-1',
			statement: 'Calculez: $$\\frac{15}{3}$$' as QuestionInstance['statement'],
			solution: '5',
			precision: { type: 'none' },
			correction: {
				steps: [
					'Pour diviser 15 par 3, on cherche combien de fois 3 rentre dans 15. La réponse est **5** car $$3 \\times 5 = 15$$.' as QuestionInstance['statement']
				]
			},
			grades: ['6', '5']
		},
		numerical_decimal: {
			templateId: 'debug-numerical-2',
			statement: 'Calculez avec 2 décimales: $$\\frac{22}{7}$$' as QuestionInstance['statement'],
			solution: '3.14',
			precision: { type: 'decimal', digits: 2 },
			correction: {
				steps: [
					'La division $$22 \\div 7 \\approx 3.142857...$$. Arrondie à 2 décimales, la réponse est **3.14**.' as QuestionInstance['statement']
				]
			},
			grades: ['4', '3']
		},
		algebraic_transform: {
			templateId: 'debug-algebraic-1',
			statement: 'Factorisez: $$x^2 - 9$$' as QuestionInstance['statement'],
			solution: '(x-3)(x+3)',
			correction: {
				steps: [
					'On reconnaît une différence de carrés: $$a^2 - b^2 = (a-b)(a+b)$$. Ici, $$x^2 - 9 = x^2 - 3^2 = (x-3)(x+3)$$.' as QuestionInstance['statement']
				]
			},
			grades: ['3', '2']
		},
		fill_in_blanks: {
			templateId: 'debug-blanks-1',
			statement:
				"Si les côtés sont 3 et 4, l'hypoténuse est ____ selon le théorème de ____." as QuestionInstance['statement'],
			solution: ['5', 'Pythagore'],
			blanks: [
				{ expectedAnswer: '5', type: 'math' },
				{ expectedAnswer: 'Pythagore', type: 'text' }
			],
			correction: {
				steps: [
					'Le théorème de **Pythagore** dit que $$c^2 = a^2 + b^2$$. Donc $$c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$$.' as QuestionInstance['statement']
				]
			},
			grades: ['4', '3']
		},
		// Reprises de la démo `/demo/question-display-demo`
		fraction_sum: {
			templateId: 'demo-numerical',
			statement: resolvedMarkdown('Calculez $$\\frac{3}{4} + \\frac{1}{2} = $$ ____'),
			// Sans `blanks`, getQuestionType() classe quand même la question en
			// `fill_in_blanks` (il n'existe pas de type « numérique ») et la face
			// réponse n'a alors rien à afficher.
			blanks: [{ expectedAnswer: '5/4', expectedAnswerLatex: '\\frac{5}{4}', type: 'math' }],
			grades: ['6', '5'],
			theme: 'Algèbre',
			domain: 'Fractions',
			level: 1,
			correction: {
				steps: [
					resolvedMarkdown(
						'Pour additionner des fractions, il faut trouver un dénominateur commun :\n\n$$\\frac{3}{4} + \\frac{1}{2} = \\frac{3}{4} + \\frac{2}{4} = \\frac{5}{4}$$'
					)
				]
			}
		},
		qcm_pi: {
			templateId: 'demo-qcm',
			statement: resolvedMarkdown(
				'Quelle est la valeur de $\\pi$ arrondie au centième ?\n\n```choix\ncase: 0\n- $$3{,}00$$\n- $$3{,}14$$\n- $$3{,}41$$\n- $$2{,}71$$\n```'
			),
			blanks: [
				{
					expectedAnswer: '1',
					type: 'choice',
					choice: {
						choices: ['$$3{,}00$$', '$$3{,}14$$', '$$3{,}41$$', '$$2{,}71$$'],
						order: [0, 1, 2, 3],
						multiple: false
					}
				}
			],
			grades: ['6'],
			theme: 'Géométrie',
			domain: 'Constantes',
			level: 1,
			correction: {
				steps: [
					resolvedMarkdown('$$\\pi \\approx 3{,}14159...$$ donc, arrondi au centième : $$3{,}14$$')
				]
			}
		},
		pythagore_blanks: {
			templateId: 'demo-fill-blanks',
			statement: resolvedMarkdown(
				'Le théorème de Pythagore dit que, dans un triangle rectangle : $$a^2 + b^2 = ____^2$$, où ____ est l’hypoténuse.'
			),
			blanks: [
				{ expectedAnswer: 'c', type: 'math' },
				{ expectedAnswer: 'c', type: 'text' }
			],
			grades: ['4', '3'],
			theme: 'Géométrie',
			domain: 'Théorème de Pythagore',
			level: 2,
			correction: {
				steps: [
					resolvedMarkdown(
						"Le théorème de Pythagore : $$a^2 + b^2 = c^2$$ où $$c$$ est l'hypoténuse (le côté opposé à l'angle droit)."
					)
				]
			}
		}
	};

	const QUESTION_ITEMS = [
		{ value: 'numerical_exact', label: 'Numérique (exacte)' },
		{ value: 'numerical_decimal', label: 'Numérique (décimale)' },
		{ value: 'algebraic_transform', label: 'Transformation algébrique' },
		{ value: 'fill_in_blanks', label: 'Texte à trous' },
		{ value: 'fraction_sum', label: 'Somme de fractions, à trou' },
		{ value: 'qcm_pi', label: 'Case choix : valeur de π' },
		{ value: 'pythagore_blanks', label: 'Pythagore, deux trous' },
		{ value: 'figure_a_completer', label: 'Figure à compléter (CP-059)' },
		{ value: 'figure_carre', label: 'Terminer un carré (CP-060)' },
		{ value: 'figure_alignes', label: 'Points alignés ? (CP-058)' }
	];
	const SIZE_ITEMS = [
		{ value: 'sm', label: 'Petite' },
		{ value: 'md', label: 'Moyenne' },
		{ value: 'lg', label: 'Grande' }
	];

	function labelOf(items: { value: string; label: string }[], value: string): string {
		return items.find((item) => item.value === value)?.label ?? value;
	}

	// Current question instance
	let currentInstance = $derived(sampleQuestions[selectedQuestionType]);

	// ============================================================================
	// EVENT HANDLERS
	// ============================================================================

	function handleAnswerSubmit(answer: AnswerData) {
		answerSubmitLog = [...answerSubmitLog, answer];
		console.log('[QuestionDisplay Debug] Answer submitted:', answer);
	}

	function handleAnswerChange(value: string | string[]) {
		const timestamp = new Date().toISOString();
		answerChangeLog = [...answerChangeLog, `[${timestamp}] ${JSON.stringify(value)}`];
		console.log('[QuestionDisplay Debug] Answer changed:', value);
	}

	function handleComplete(stats: QuestionStats) {
		completionStats = stats;
		console.log('[QuestionDisplay Debug] Question completed:', stats);
	}

	function handleFlip(isFlipped: boolean) {
		flipLog = [...flipLog, { timestamp: new Date().toISOString(), isFlipped }];
		console.log('[QuestionDisplay Debug] Flipped:', isFlipped);
	}

	function resetLogs() {
		answerSubmitLog = [];
		answerChangeLog = [];
		flipLog = [];
		completionStats = null;
		console.log('[QuestionDisplay Debug] Logs cleared');
	}

	function changeQuestion() {
		resetLogs();
		console.log('[QuestionDisplay Debug] Question changed to:', selectedQuestionType);
	}

	async function copyToClipboard(text: string, section: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedSection = section;
			setTimeout(() => {
				copiedSection = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const instanceJSON = $derived(JSON.stringify(currentInstance, null, 2));
	const answerSubmitJSON = $derived(JSON.stringify(answerSubmitLog, null, 2));
	const completionStatsJSON = $derived(JSON.stringify(completionStats, null, 2));
</script>

<svelte:head>
	<title>Carte question · Pages de dev</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<!-- Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Carte question</h1>
		<p class="text-muted-foreground">
			Le composant <code>FlashCard</code>, ses réglages et son état en direct.
		</p>
	</div>

	<Separator />

	<!-- Configuration Panel -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Configuration</Card.Title>
			<Card.Description>Adjust component props and behavior</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Question Type Selector -->
			<div class="space-y-2">
				<span class="text-sm font-medium">Question</span>
				<MySelect
					triggerAriaLabel={`Question : ${labelOf(QUESTION_ITEMS, selectedQuestionType)}`}
					type="single"
					items={QUESTION_ITEMS}
					bind:value={selectedQuestionType}
					onValueChange={() => changeQuestion()}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<!-- Mode -->
				<div class="space-y-2">
					<Label>Mode</Label>
					<div class="flex gap-2" role="group" aria-label="Mode de visualisation">
						<Button
							variant={!interactive ? 'default' : 'outline'}
							onclick={() => {
								interactive = false;
								resetLogs();
							}}
							class="flex-1"
						>
							Lecture seule
						</Button>
						<Button
							variant={interactive ? 'default' : 'outline'}
							onclick={() => {
								interactive = true;
								resetLogs();
							}}
							class="flex-1"
						>
							Interactive
						</Button>
					</div>
				</div>

				<!-- Size -->
				<div class="space-y-2">
					<span class="text-sm font-medium">Taille</span>
					<MySelect
						triggerAriaLabel={`Taille : ${labelOf(SIZE_ITEMS, size)}`}
						type="single"
						items={SIZE_ITEMS}
						bind:value={() => size, (v) => (size = v as typeof size)}
					/>
				</div>
			</div>

			<!-- Toggles -->
			<div class="grid grid-cols-2 gap-4">
				<MyCheckbox
					bind:checked={showCorrectionOnWrong}
					label="Retourner la carte après une mauvaise réponse"
				/>

				<div class="space-y-1">
					<Label for="max-attempts">Max attempts (0 = unlimited)</Label>
					<Input id="max-attempts" type="number" min="0" bind:value={maxAttempts} class="w-full" />
				</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={resetLogs} variant="outline" class="gap-2">
					<RefreshCw class="h-4 w-4" />
					Reset Logs
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Component Preview -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Component Preview</Card.Title>
			<Card.Description>Live FlashCard component</Card.Description>
		</Card.Header>
		<Card.Content>
			<!-- Remontée à chaque question : la carte ne garde ni réponse ni retournement -->
			{#key selectedQuestionType}
				<FlashCard
					{interactive}
					instance={currentInstance as QuestionInstance}
					onAnswerSubmit={handleAnswerSubmit}
					_onAnswerChange={handleAnswerChange}
					onComplete={handleComplete}
					onFlip={handleFlip}
					{size}
					{showCorrectionOnWrong}
					{maxAttempts}
				/>
			{/key}
		</Card.Content>
	</Card.Root>

	<!-- Debug Information Tabs -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Debug Information</Card.Title>
			<Card.Description>Real-time component state and event logs</Card.Description>
		</Card.Header>
		<Card.Content>
			<Tabs.Root value="instance">
				<Tabs.List class="grid w-full grid-cols-5">
					<Tabs.Trigger value="instance">Instance</Tabs.Trigger>
					<Tabs.Trigger value="submissions">Submissions</Tabs.Trigger>
					<Tabs.Trigger value="changes">Changes</Tabs.Trigger>
					<Tabs.Trigger value="flips">Flips</Tabs.Trigger>
					<Tabs.Trigger value="stats">Statistics</Tabs.Trigger>
				</Tabs.List>

				<!-- Instance Tab -->
				<Tabs.Content value="instance" class="space-y-4">
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-semibold">Question Instance</h3>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => copyToClipboard(instanceJSON, 'instance')}
								class="gap-2"
							>
								{#if copiedSection === 'instance'}
									<Check class="h-4 w-4" />
									Copied!
								{:else}
									<Copy class="h-4 w-4" />
									Copy JSON
								{/if}
							</Button>
						</div>
						<div class="rounded-lg border bg-muted/50 p-4">
							<pre class="overflow-auto text-xs"><code>{instanceJSON}</code></pre>
						</div>
					</div>

					<div class="space-y-2">
						<h3 class="text-lg font-semibold">Instance Metadata</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<span class="text-sm font-medium">Template ID:</span>
								<Badge variant="outline" class="ml-2">{currentInstance.templateId}</Badge>
							</div>
							<div>
								<span class="text-sm font-medium">Type:</span>
								<Badge variant="outline" class="ml-2">{getQuestionType(currentInstance)}</Badge>
							</div>
							<div>
								<span class="text-sm font-medium">Grades:</span>
								<div class="ml-2 inline-flex gap-1">
									{#each currentInstance.grades || [] as grade (grade)}
										<Badge variant="secondary">{grade}</Badge>
									{/each}
								</div>
							</div>
							<div>
								<span class="text-sm font-medium">Solution Type:</span>
								<Badge variant="outline" class="ml-2">
									{Array.isArray(currentInstance.solution) ? 'Array' : 'String'}
								</Badge>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<!-- Submissions Tab -->
				<Tabs.Content value="submissions" class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">
							Answer Submissions ({answerSubmitLog.length})
						</h3>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => copyToClipboard(answerSubmitJSON, 'submissions')}
							class="gap-2"
						>
							{#if copiedSection === 'submissions'}
								<Check class="h-4 w-4" />
								Copied!
							{:else}
								<Copy class="h-4 w-4" />
								Copy JSON
							{/if}
						</Button>
					</div>

					{#if answerSubmitLog.length === 0}
						<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No submissions yet. Submit an answer to see logs here.
						</div>
					{:else}
						<div class="space-y-3">
							{#each answerSubmitLog as submission, i (i)}
								<div class="rounded-lg border p-4">
									<div class="mb-2 flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Badge variant={submission.isCorrect ? 'default' : 'destructive'}>
												Attempt {i + 1}
											</Badge>
											<Badge variant="outline">{submission.submittedAt}</Badge>
										</div>
										<Badge variant={submission.isCorrect ? 'default' : 'secondary'}>
											{submission.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
										</Badge>
									</div>
									<div class="space-y-1 text-sm">
										<div>
											<span class="font-medium">Value:</span>
											<code class="ml-2 rounded bg-muted px-1 py-0.5">
												{JSON.stringify(submission.value)}
											</code>
										</div>
										<div>
											<span class="font-medium">Time Spent:</span>
											<span class="ml-2">{submission.timeSpent}s</span>
										</div>
										<div>
											<span class="font-medium">Attempts:</span>
											<span class="ml-2">{submission.attempts}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Tabs.Content>

				<!-- Changes Tab -->
				<Tabs.Content value="changes" class="space-y-4">
					<h3 class="text-lg font-semibold">Answer Changes ({answerChangeLog.length})</h3>

					{#if answerChangeLog.length === 0}
						<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No changes yet. Type an answer to see real-time logs here.
						</div>
					{:else}
						<div class="max-h-96 space-y-1 overflow-auto rounded-lg border bg-muted/50 p-4">
							{#each answerChangeLog as change, i (i)}
								<div class="font-mono text-xs">{change}</div>
							{/each}
						</div>
					{/if}
				</Tabs.Content>

				<!-- Flips Tab -->
				<Tabs.Content value="flips" class="space-y-4">
					<h3 class="text-lg font-semibold">Flip Events ({flipLog.length})</h3>

					{#if flipLog.length === 0}
						<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No flips yet. Click the flip button to see logs here.
						</div>
					{:else}
						<div class="space-y-2">
							{#each flipLog as flip, i (i)}
								<div class="flex items-center justify-between rounded-lg border p-3">
									<div class="flex items-center gap-2">
										<Badge variant="outline">Flip {i + 1}</Badge>
										<span class="text-sm">{flip.timestamp}</span>
									</div>
									<Badge variant={flip.isFlipped ? 'default' : 'secondary'}>
										{flip.isFlipped ? 'Back ↻' : 'Front →'}
									</Badge>
								</div>
							{/each}
						</div>
					{/if}
				</Tabs.Content>

				<!-- Statistics Tab -->
				<Tabs.Content value="stats" class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">Completion Statistics</h3>
						{#if completionStats}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => copyToClipboard(completionStatsJSON, 'stats')}
								class="gap-2"
							>
								{#if copiedSection === 'stats'}
									<Check class="h-4 w-4" />
									Copied!
								{:else}
									<Copy class="h-4 w-4" />
									Copy JSON
								{/if}
							</Button>
						{/if}
					</div>

					{#if !completionStats}
						<div class="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No completion yet. Complete a question (correct answer or max attempts) to see
							statistics.
						</div>
					{:else}
						<div class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<Card.Root>
									<Card.Header class="pb-3">
										<Card.Title class="text-sm">Time Spent</Card.Title>
									</Card.Header>
									<Card.Content>
										<div class="text-2xl font-bold">{completionStats.timeSpent}s</div>
									</Card.Content>
								</Card.Root>

								<Card.Root>
									<Card.Header class="pb-3">
										<Card.Title class="text-sm">Total Attempts</Card.Title>
									</Card.Header>
									<Card.Content>
										<div class="text-2xl font-bold">{completionStats.attempts}</div>
									</Card.Content>
								</Card.Root>

								<Card.Root>
									<Card.Header class="pb-3">
										<Card.Title class="text-sm">Final Result</Card.Title>
									</Card.Header>
									<Card.Content>
										<Badge variant={completionStats.isCorrect ? 'default' : 'destructive'}>
											{completionStats.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
										</Badge>
									</Card.Content>
								</Card.Root>

								<Card.Root>
									<Card.Header class="pb-3">
										<Card.Title class="text-sm">First Attempt</Card.Title>
									</Card.Header>
									<Card.Content>
										<Badge variant={completionStats.firstAttemptCorrect ? 'default' : 'secondary'}>
											{completionStats.firstAttemptCorrect ? 'Correct ✓' : 'Incorrect ✗'}
										</Badge>
									</Card.Content>
								</Card.Root>
							</div>

							<div class="space-y-2">
								<h4 class="font-semibold">Full Statistics Object</h4>
								<div class="rounded-lg border bg-muted/50 p-4">
									<pre class="overflow-auto text-xs"><code>{completionStatsJSON}</code></pre>
								</div>
							</div>
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>

	<!-- Browser & Environment Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Environment Information</Card.Title>
			<Card.Description>Browser and runtime details</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium">User Agent:</span>
					<code class="ml-2 text-xs">{browser ? navigator.userAgent : 'SSR - Not available'}</code>
				</div>
				<div>
					<span class="font-medium">Viewport:</span>
					<code class="ml-2"
						>{browser
							? `${window.innerWidth}×${window.innerHeight}px`
							: 'SSR - Not available'}</code
					>
				</div>
				<div>
					<span class="font-medium">ResizeObserver Support:</span>
					<Badge variant={browser && 'ResizeObserver' in window ? 'default' : 'destructive'}>
						{browser && 'ResizeObserver' in window ? 'Yes ✓' : 'No ✗'}
					</Badge>
				</div>
				<div>
					<span class="font-medium">Current Time:</span>
					<code class="ml-2">{new Date().toISOString()}</code>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
