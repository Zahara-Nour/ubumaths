<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		captureError,
		captureValidationError,
		capturePerformance
	} from '$lib/utils/errorMonitoring';

	function testClientError() {
		throw new Error('Test client-side error');
	}

	function testPromiseRejection() {
		Promise.reject('Test unhandled promise rejection');
	}

	function testManualCapture() {
		try {
			throw new Error('Test manual error capture');
		} catch (err) {
			captureError(err as Error, {
				severity: 'warning',
				context: { testData: 'This is test context' },
				tags: ['test', 'manual']
			});
			alert('Error captured manually (check console)');
		}
	}

	function testValidationError() {
		captureValidationError('email', 'Email is required', {
			email: '',
			name: 'Test User'
		});
		alert('Validation error captured (check dashboard)');
	}

	function testPerformanceIssue() {
		// Simulate slow operation
		capturePerformance('testOperation', 5000, 1000, {
			operation: 'data_processing',
			recordCount: 10000
		});
		alert('Performance issue captured (check dashboard)');
	}

	async function testServerError() {
		try {
			const response = await fetch('/api/errors/test-endpoint-that-does-not-exist');
			if (!response.ok) {
				alert('Server error triggered (check dashboard)');
			}
		} catch (_err) {
			alert('Server error triggered (check dashboard)');
		}
	}
</script>

<div class="container mx-auto max-w-4xl py-8">
	<h1 class="mb-6 text-3xl font-bold">Test Error Monitoring System</h1>

	<div class="space-y-4">
		<Card.Root>
			<Card.Header>
				<Card.Title>Client-Side Errors</Card.Title>
				<Card.Description>Test automatic error capture in the browser</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testClientError} variant="destructive">Trigger JavaScript Error</Button>
				<p class="text-sm text-muted-foreground">
					This will throw an uncaught error and capture it automatically
				</p>

				<Button onclick={testPromiseRejection} variant="destructive">
					Trigger Promise Rejection
				</Button>
				<p class="text-sm text-muted-foreground">This will create an unhandled promise rejection</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Manual Error Capture</Card.Title>
				<Card.Description>Test manual error reporting with context</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testManualCapture}>Capture Error with Context</Button>
				<p class="text-sm text-muted-foreground">
					This will capture an error with custom severity and context
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Validation Errors</Card.Title>
				<Card.Description>Test form validation error tracking</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testValidationError}>Capture Validation Error</Button>
				<p class="text-sm text-muted-foreground">This will capture a form validation error</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Performance Monitoring</Card.Title>
				<Card.Description>Test performance issue tracking</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testPerformanceIssue}>Report Slow Operation</Button>
				<p class="text-sm text-muted-foreground">
					This will report a simulated slow operation (5000ms vs 1000ms threshold)
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Server Errors</Card.Title>
				<Card.Description>Test server-side error capture</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button onclick={testServerError}>Trigger 404 Error</Button>
				<p class="text-sm text-muted-foreground">
					This will make a request to a non-existent endpoint
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-green-500">
			<Card.Header>
				<Card.Title>View Results</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="mb-4">After testing, view the captured errors in the dashboard:</p>
				<Button onclick={() => (window.location.href = '/dashboard/admin/errors')}>
					Open Error Dashboard
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
</div>
