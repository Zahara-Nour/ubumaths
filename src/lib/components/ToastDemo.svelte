<script lang="ts">
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';

	function showSuccessToast() {
		toaster.success('Success! Operation completed successfully.');
	}

	function showErrorToast() {
		toaster.error('Error! Something went wrong.');
	}

	function showWarningToast() {
		toaster.warning('Warning! Please check your input.');
	}

	function showInfoToast() {
		toaster.info('Information: This is a demo toast notification.');
	}

	function showLongToast() {
		toaster.info(
			'Long Message: This is a longer toast message that demonstrates how the toast handles more content.'
		);
	}

	function showPersistentToast() {
		toaster.message('Persistent Toast: This toast stays until you dismiss it manually!');
	}
</script>

<div class="toast-demo rounded-lg border border-border bg-card p-6 text-card-foreground">
	<h2 class="mb-4 text-xl font-semibold text-foreground">Toast Notifications Demo</h2>
	<p class="mb-6 text-muted-foreground">
		Click the buttons below to see different types of toast notifications:
	</p>

	<div class="button-grid">
		<Button onclick={showSuccessToast} class="bg-green-600 hover:bg-green-700">
			Success Toast
		</Button>

		<Button onclick={showErrorToast} variant="destructive">Error Toast</Button>

		<Button onclick={showWarningToast} class="bg-orange-600 hover:bg-orange-700">
			Warning Toast
		</Button>

		<Button onclick={showInfoToast}>Info Toast</Button>

		<Button onclick={showLongToast} variant="secondary">Long Message</Button>

		<Button onclick={showPersistentToast} variant="outline">Persistent Toast</Button>
	</div>
</div>

<style>
	.toast-demo {
		max-width: 600px;
		margin: 0 auto;
	}

	.button-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}
</style>
