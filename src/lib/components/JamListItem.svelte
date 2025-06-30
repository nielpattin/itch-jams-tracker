<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X } from '@lucide/svelte';
	import type { jam as jamSchema } from '$lib/server/db/schema';
	import { onMount, onDestroy } from 'svelte';
	import { timePreference } from '$lib/stores/timePreference';

	type Jam = typeof jamSchema.$inferSelect;

	let {
		jam,
		onAction,
		actionType
	}: { jam: Jam; onAction: () => void; actionType: 'track' | 'untrack' } = $props();

	let status: string = $state('');
	let interval: NodeJS.Timeout;

	function updateStatus() {
		const now = new Date().getTime();
		const startTime = new Date(jam.startDate).getTime();
		const endTime = new Date(jam.endDate).getTime();

		if (now > endTime) {
			status = 'Ended';
			clearInterval(interval);
		} else if (now >= startTime && now <= endTime) {
			status = 'Ongoing';
		} else {
			const diff = startTime - now;
			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);

			status = `${days}d ${hours}h ${minutes}m ${seconds}s`;
		}
	}

	onMount(() => {
		updateStatus(); // Initial call
		interval = setInterval(updateStatus, 1000);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	// Format the start time (e.g., "YYYY-MM-DD HH:MM")
	let formattedStartTime = $derived(
		$timePreference === 'UTC'
			? new Date(jam.startDate).toUTCString()
			: new Date(jam.startDate).toLocaleString()
	);

	let formattedEndTime = $derived(
		$timePreference === 'UTC'
			? new Date(jam.endDate).toUTCString()
			: new Date(jam.endDate).toLocaleString()
	);
</script>

<div class="flex items-center justify-between gap-4 py-2">
	{#if actionType === 'track'}
		<div class="min-w-0 flex-grow">
			<a href={jam.jamPageUrl} class="block truncate font-semibold">{jam.title}</a>
			<p class="text-muted-foreground text-xs">{formattedStartTime}</p>
		</div>
		<div class="flex-shrink-0">
			<Button onclick={onAction}>Add</Button>
		</div>
	{:else if actionType === 'untrack'}
		<div class="min-w-0 flex-grow">
			<a href={jam.jamPageUrl} class="block truncate font-semibold">{jam.title}</a>
			<p class="text-muted-foreground text-xs">
				{#if status === 'Ongoing'}
					Ends: {formattedEndTime}
				{:else}
					Starts: {formattedStartTime}
				{/if}
			</p>
		</div>
		<div class="flex-shrink-0 text-sm text-green-500" class:text-red-500={status === 'Ended'}>
			{status}
		</div>
		<div class="flex-shrink-0">
			<Button onclick={onAction} variant="destructive" size="icon"><X class="h-4 w-4" /></Button>
		</div>
	{/if}
</div>
