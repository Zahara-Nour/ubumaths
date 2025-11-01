<!--
	Question Display Component Debug Page
	=======================================

	Comprehensive debugging interface for QuestionDisplay component.
	Shows all internal state, props, validation results, and statistics.
-->

<script lang="ts">
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { AnswerData, QuestionStats } from '$lib/types/question-display';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { RefreshCw, Copy, Check } from 'lucide-svelte';
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

	const sampleQuestions: Record<
		string,
		Partial<QuestionInstance> & Pick<QuestionInstance, 'type' | 'templateId'>
	> = {
		numerical_exact: {
			templateId: 'debug-numerical-1',
			type: 'numerical_exact',
			statement: [
				{
					type: 'text',
					content: 'Calculez: $$\\frac{15}{3}$$'
				}
			],
			answer: '5',
			precision: { type: 'none' },
			correction: [
				{
					type: 'text',
					content:
						'Pour diviser 15 par 3, on cherche combien de fois 3 rentre dans 15. La réponse est **5** car $$3 \\times 5 = 15$$.'
				}
			],
			grades: ['6', '5']
		},
		numerical_decimal: {
			templateId: 'debug-numerical-2',
			type: 'numerical_decimal',
			statement: [
				{
					type: 'text',
					content: 'Calculez avec 2 décimales: $$\\frac{22}{7}$$'
				}
			],
			answer: '3.14',
			precision: { type: 'decimal', digits: 2 },
			correction: [
				{
					type: 'text',
					content:
						'La division $$22 \\div 7 \\approx 3.142857...$$. Arrondie à 2 décimales, la réponse est **3.14**.'
				}
			],
			grades: ['4', '3']
		},
		algebraic_transform: {
			templateId: 'debug-algebraic-1',
			type: 'algebraic_transform',
			statement: [
				{
					type: 'text',
					content: 'Factorisez: $$x^2 - 9$$'
				}
			],
			answer: '(x-3)(x+3)',
			transformType: 'factor',
			correction: [
				{
					type: 'text',
					content:
						'On reconnaît une différence de carrés: $$a^2 - b^2 = (a-b)(a+b)$$. Ici, $$x^2 - 9 = x^2 - 3^2 = (x-3)(x+3)$$.'
				}
			],
			grades: ['3', '2']
		},
		fill_in_blanks: {
			templateId: 'debug-blanks-1',
			type: 'fill_in_blanks',
			statement: [
				{
					type: 'text',
					content: "Si les côtés sont 3 et 4, l'hypoténuse est ____ selon le théorème de ____."
				}
			],
			answer: ['5', 'Pythagore'],
			blanks: [
				{ position: 0, expectedAnswer: '5' },
				{ position: 1, expectedAnswer: 'Pythagore' }
			],
			correction: [
				{
					type: 'text',
					content:
						'Le théorème de **Pythagore** dit que $$c^2 = a^2 + b^2$$. Donc $$c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$$.'
				}
			],
			grades: ['4', '3']
		},
		multiple_choice: {
			templateId: 'debug-qcm-1',
			type: 'multiple_choice',
			statement: [
				{
					type: 'text',
					content: 'Résolvez: $$2x + 5 = 13$$'
				}
			],
			answer: '0',
			choices: [
				{ content: [{ type: 'text', content: '$$x = 4$$' }], isCorrect: true },
				{ content: [{ type: 'text', content: '$$x = 9$$' }], isCorrect: false },
				{ content: [{ type: 'text', content: '$$x = 6.5$$' }], isCorrect: false }
			],
			shuffledChoices: [
				{ content: [{ type: 'text', content: '$$x = 4$$' }], originalIndex: 0 },
				{ content: [{ type: 'text', content: '$$x = 9$$' }], originalIndex: 1 },
				{ content: [{ type: 'text', content: '$$x = 6.5$$' }], originalIndex: 2 }
			],
			multipleAnswers: false,
			correction: [
				{
					type: 'text',
					content:
						'On résout: $$2x + 5 = 13 \\Rightarrow 2x = 13 - 5 \\Rightarrow 2x = 8 \\Rightarrow x = 4$$.'
				}
			],
			grades: ['3', '2']
		}
	};

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

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">QuestionDisplay Component Debug</h1>
		<p class="text-muted-foreground">
			Test and debug the QuestionDisplay component with real-time state inspection.
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
				<label class="text-sm font-medium">Question Type</label>
				<select
					bind:value={selectedQuestionType}
					onchange={() => changeQuestion()}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<option value="numerical_exact">Numerical (Exact)</option>
					<option value="numerical_decimal">Numerical (Decimal)</option>
					<option value="algebraic_transform">Algebraic Transform</option>
					<option value="fill_in_blanks">Fill-in-Blanks</option>
					<option value="multiple_choice">Multiple Choice (QCM)</option>
				</select>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<!-- Mode -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Mode</label>
					<div class="flex gap-2">
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
					<label class="text-sm font-medium">Size</label>
					<select
						bind:value={size}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						<option value="sm">Small</option>
						<option value="md">Medium</option>
						<option value="lg">Large</option>
					</select>
				</div>
			</div>

			<!-- Toggles -->
			<div class="grid grid-cols-2 gap-4">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={showCorrectionOnWrong} class="h-4 w-4" />
					<span class="text-sm">Auto-flip on wrong answer</span>
				</label>

				<div class="space-y-1">
					<label class="text-sm">Max attempts (0 = unlimited)</label>
					<Input type="number" min="0" bind:value={maxAttempts} class="w-full" />
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
			<FlashCard
				{interactive}
				instance={currentInstance as QuestionInstance}
				onAnswerSubmit={handleAnswerSubmit}
				onAnswerChange={handleAnswerChange}
				onComplete={handleComplete}
				onFlip={handleFlip}
				{size}
				{showCorrectionOnWrong}
				{maxAttempts}
			/>
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
								<Badge variant="outline" class="ml-2">{currentInstance.type}</Badge>
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
								<span class="text-sm font-medium">Answer Type:</span>
								<Badge variant="outline" class="ml-2">
									{Array.isArray(currentInstance.answer) ? 'Array' : 'String'}
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
