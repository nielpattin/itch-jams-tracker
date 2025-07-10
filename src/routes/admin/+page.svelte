<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';

	let isSubmitting = $state(false);
	let responseStatus: 'success' | 'error' | null = $state(null);
	let scraperStatus: 'running' | 'idle' = $state('idle');
	let pendingStatus = $state<'running' | 'idle' | null>(null);

	async function fetchScraperStatus() {
		try {
			const res = await fetch('/admin/scraper-status');
			if (res.ok) {
				const data = await res.json();
				scraperStatus = data.status;
			}
		} catch {
			scraperStatus = 'idle';
		}
		pendingStatus = null;
	}

	// Fetch status on mount and poll every 3s if running
	$effect(() => {
		fetchScraperStatus();
		let interval: NodeJS.Timeout | null = null;
		if (scraperStatus === 'running') {
			interval = setInterval(fetchScraperStatus, 3000);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	});

	// Removed handleSubmit; handled by enhance

	// Removed endScraping function; handled by form POST

	$effect(() => {
		if (responseStatus === 'success') {
			toast.success('Scraping initiated successfully!');
			invalidateAll();
		} else if (responseStatus === 'error') {
			toast.error('Failed to initiate scraping.');
		}
	});
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">Admin Panel</h1>

	<div class="bg-card rounded-lg p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold">Scraper Control</h2>
		<p class="text-muted-foreground mb-4">
			Click the button below to manually trigger the Itch.io jam scraper. This will fetch the latest
			jam data and update the database.
		</p>
		<p class="mb-4 font-medium">
			{(pendingStatus ?? scraperStatus) === 'running'
				? 'Scraper is running...'
				: 'Scraper is idle.'}
		</p>
		<div class="flex gap-2">
			<form
				method="POST"
				action="?/runScraper"
				use:enhance={() => {
					pendingStatus = 'running';
					return async ({ result }) => {
						await fetchScraperStatus();
					};
				}}
			>
				<Button type="submit" disabled={(pendingStatus ?? scraperStatus) === 'running'}
					>Run Scraper</Button
				>
			</form>
			<form
				method="POST"
				action="?/endScraper"
				use:enhance={() => {
					pendingStatus = 'idle';
					return async ({ result }) => {
						await fetchScraperStatus();
					};
				}}
			>
				<Button type="submit" disabled={(pendingStatus ?? scraperStatus) !== 'running'}
					>End Scrapping</Button
				>
			</form>
		</div>
	</div>
</div>
