<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X } from '@lucide/svelte';
	import type { jam as jamSchema } from '$lib/server/db/schema';
	import { timePreference } from '$lib/stores/timePreference';

	type Jam = typeof jamSchema.$inferSelect;

	let {
		jam,
		onAction,
		actionType
	}: { jam: Jam; onAction: () => void; actionType: 'track' | 'untrack' } = $props();

	let currentPreference = $derived($timePreference);

	const getDisplayStatus = (status: Jam['status']) => {
		switch (status) {
			case 'upcoming':
				return 'Upcoming';
			case 'in-progress':
				return 'In Progress';
			case 'voting':
				return 'Voting';
			case 'ended':
				return 'Ended';
			default:
				return 'Unknown';
		}
	};

	const formatDateTime = (date: Date | null) => {
		if (!date || isNaN(date.getTime())) {
			return 'N/A';
		}

		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		};

		if (currentPreference === 'UTC') {
			options.timeZone = 'UTC';
		}

		return new Intl.DateTimeFormat('en-US', options).format(date);
	};

	// Helper function to parse date strings and validate them
	function parseDate(date: string | Date | null): Date | null {
		if (date === null) return null;
		if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
		// Try ISO first, then fallback to parsing with Date.parse
		let parsed = new Date(date);
		if (!isNaN(parsed.getTime())) return parsed;
		const timestamp = Date.parse(date.replace(/-/g, '/'));
		parsed = new Date(timestamp);
		return isNaN(parsed.getTime()) ? null : parsed;
	}
	// Countdown state for in-progress jams
	let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
	let label = $state('');
	let showCountdown = $state(true);

	function updateCountdown() {
		const now = new Date();
		let target: Date | null = null;
		showCountdown = true;

		if (jam.status === 'upcoming') {
			target = parseDate(jam.startDate);
			label = 'Starts in';
		} else if (jam.status === 'in-progress') {
			target = parseDate(jam.endDate);
			label = 'Ends in';
		} else if (jam.status === 'voting') {
			target = parseDate(jam.endDate);
			label = 'Voting ends in';
		} else if (jam.status === 'ended') {
			target = parseDate(jam.endDate);
			if (target) {
				const diffDays = Math.floor((now.getTime() - target.getTime()) / 86400000);
				label = `Ended ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
			} else {
				label = 'Ended';
			}
			showCountdown = false;
			countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
			return;
		} else {
			label = getDisplayStatus(jam.status);
			showCountdown = false;
			countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
			return;
		}

		if (!target) {
			countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
			return;
		}
		let diff = Math.floor((target.getTime() - now.getTime()) / 1000);
		if (diff <= 0) {
			countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
			return;
		}
		const days = Math.floor(diff / 86400);
		diff %= 86400;
		const hours = Math.floor(diff / 3600);
		diff %= 3600;
		const minutes = Math.floor(diff / 60);
		const seconds = diff % 60;
		countdown = { days, hours, minutes, seconds, expired: false };
	}

	$effect(() => {
		updateCountdown();
		let interval: ReturnType<typeof setInterval> | undefined;
		let timeout: ReturnType<typeof setTimeout> | undefined;
		if (jam.status === 'in-progress' || jam.status === 'voting' || jam.status === 'upcoming') {
			const syncTick = () => {
				updateCountdown();
				interval = setInterval(updateCountdown, 1000);
			};
			const msToNextSecond = 1000 - (Date.now() % 1000);
			timeout = setTimeout(syncTick, msToNextSecond);
		}
		return () => {
			if (interval) clearInterval(interval);
			if (timeout) clearTimeout(timeout);
		};
	});
</script>

<div class="flex items-center justify-between gap-4 py-2">
	{#if actionType === 'track'}
		<div class="min-w-0 flex-grow">
			<a href={jam.jamPageUrl} class="block font-semibold break-words">{jam.title}</a>
			{#if jam.status === 'upcoming'}
				<p class="text-muted-foreground text-xs">
					Starts: {formatDateTime(parseDate(jam.startDate))}
				</p>
			{/if}
			{#if jam.endDate && jam.status !== 'upcoming'}
				<p class="text-muted-foreground text-xs">Ends: {formatDateTime(parseDate(jam.endDate))}</p>
			{/if}
		</div>
		<div class="flex-shrink-0">
			<Button onclick={onAction}>Add</Button>
		</div>
	{:else if actionType === 'untrack'}
		<div class="min-w-0 flex-grow">
			<a href={jam.jamPageUrl} class="block font-semibold break-words">{jam.title}</a>
			{#if jam.status === 'upcoming'}
				<p class="text-muted-foreground text-xs">
					Starts: {formatDateTime(parseDate(jam.startDate))}
				</p>
			{/if}
			{#if jam.endDate && jam.status !== 'upcoming'}
				<p class="text-muted-foreground text-xs">Ends: {formatDateTime(parseDate(jam.endDate))}</p>
			{/if}
		</div>
		<div class="flex flex-shrink-0 flex-col items-end text-sm">
			<div class="flex flex-row items-center gap-2">
				<div class="text-muted-foreground">{label}</div>
				{#if showCountdown}
					<div class="flex flex-col items-end text-green-400">
						<span class="whitespace-nowrap">{countdown.days}d {countdown.hours}h</span>
						<span class="whitespace-nowrap">{countdown.minutes}m {countdown.seconds}s</span>
					</div>
				{/if}
			</div>
		</div>
		<div class="flex-shrink-0">
			<Button onclick={onAction} variant="destructive" size="icon"><X class="h-4 w-4" /></Button>
		</div>
	{/if}
</div>
