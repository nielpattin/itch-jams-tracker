<script lang="ts">
	import { onMount } from 'svelte';
	import InfoButtons from '$lib/components/InfoButtons.svelte';
	import { Card, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ScrollArea, ScrollAreaScrollbar } from '$lib/components/ui/scroll-area';
	import { Input } from '$lib/components/ui/input';
	import JamListItem from '$lib/components/JamListItem.svelte';
	import { trackedJams } from '$lib/stores/trackedJams';
	import { timePreference } from '$lib/stores/timePreference';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import type { jam as jamSchema } from '$lib/server/db/schema';
	import { getJamIdsSet } from '$lib/utils'; // Import the new utility

	type Jam = typeof jamSchema.$inferSelect;

	let { data } = $props();
	let jams = $state(data.jams); // Revert to initial data.jams
	let hasMore = $state(data.hasMore);
	let nextOffset = $state(data.nextOffset);
	let isLoading = $state(false);

	// Category filter state
	const JAM_STATUSES = ['all', 'upcoming', 'in-progress', 'voting', 'ended'] as const;
	type JamStatusFilter = (typeof JAM_STATUSES)[number];
	let selectedCategory = $state<JamStatusFilter>('all');

	let trackedJamIds = $state(new Set<string>()); // Use $state for direct reactivity
	let trackedJamsData = $state<Jam[]>([]); // Store full jam objects for tracked jams

	// Derived stores for filtering
	const trackedJamsList = $derived(() => {
		return trackedJamsData.filter((jam: Jam) => trackedJamIds.has(jam.id)); // Filter only from trackedJamsData
	});
	const untrackedJams = $derived(() => {
		return jams.filter((jam: Jam) => !trackedJamIds.has(jam.id)); // Filter only from jams
	});

	// Fetch jams from server when category changes
	async function fetchJamsByCategory(category: JamStatusFilter) {
		isLoading = true;
		try {
			const url = `/jams?category=${category}&limit=10&offset=0`;
			const response = await fetch(url, {
				cache: 'no-store'
			});
			const newData = await response.json();
			jams = newData.jams;
			hasMore = newData.hasMore;
		} catch (error) {
			console.error('Error fetching jams by category:', error);
		} finally {
			isLoading = false;
		}
	}

	const loadMoreJams = async () => {
		if (!hasMore || isLoading) return;
		isLoading = true;
		try {
			const response = await fetch(
				`/jams?limit=10&offset=${jams.length}&category=${selectedCategory}`,
				{
					cache: 'no-store'
				}
			);
			const newData = await response.json();
			jams = [...jams, ...newData.jams];
			nextOffset = newData.nextOffset;
			hasMore = newData.hasMore;
		} catch (error) {
			console.error('Error loading more jams:', error);
		} finally {
			isLoading = false;
		}
	};

	let sentinel = $state<HTMLDivElement | null>(null);
	let untrackedJamsContainer = $state<HTMLDivElement | null>(null); // This is the Card component
	let untrackedJamsContent = $state<HTMLDivElement | null>(null); // This will be the CardContent component

	// IntersectionObserver setup/cleanup
	let observer: IntersectionObserver | null = $state(null);

	async function fetchJamsByIds(ids: string[]): Promise<Jam[]> {
		if (ids.length === 0) return [];
		try {
			const url = `/jams?ids=${ids.join(',')}`;
			const response = await fetch(url, { cache: 'no-store' });
			const newData = await response.json();
			return newData.jams || [];
		} catch (error) {
			console.error('Error fetching jams by IDs:', error);
			return [];
		}
	}

	onMount(() => {
		// Hydrate tracked jams from local storage immediately on mount
		trackedJams.hydrate();

		// Set up IntersectionObserver for infinite scroll
		if (sentinel && untrackedJamsContent) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							loadMoreJams();
						}
					}
				},
				{ root: untrackedJamsContent, rootMargin: '0px 0px 200px 0px', threshold: 0 }
			);
			observer.observe(sentinel);
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	// Effect to update trackedJamIds when the store changes
	$effect(() => {
		trackedJams.subscribe((ids) => {
			trackedJamIds = new Set(ids);
		});
	});

	// Derived store for IDs that are tracked but not yet in trackedJamsData
	const missingTrackedJamIds = $derived(() => {
		const currentTrackedDataIds = getJamIdsSet(trackedJamsData); // Use utility function
		return Array.from(trackedJamIds).filter((id) => !currentTrackedDataIds.has(id));
	});

	// Effect to fetch missing tracked jams and populate trackedJamsData
	$effect(() => {
		if (missingTrackedJamIds().length > 0) {
			fetchJamsByIds(missingTrackedJamIds()).then((fetchedJams) => {
				// Only add new jams if they are not already present in trackedJamsData
				const existingTrackedIds = getJamIdsSet(trackedJamsData); // Use utility function
				const newJamsToAdd = fetchedJams.filter((jam: Jam) => !existingTrackedIds.has(jam.id));
				// Always mark attempted IDs as handled to break the cycle
				if (newJamsToAdd.length > 0) {
					trackedJamsData = [...trackedJamsData, ...newJamsToAdd];
				} else if (fetchedJams.length === 0 && missingTrackedJamIds().length > 0) {
					// Automatically remove missing/unknown jam IDs from trackedJams
					missingTrackedJamIds().forEach((id) => trackedJams.remove(id));
				}
			});
		}
	});

	$effect(() => {
		if (observer && sentinel && untrackedJamsContent) {
			observer.disconnect(); // Disconnect old observer
			observer.observe(sentinel); // Observe new sentinel
		}
	});

	const timePreferenceLabel = $derived(() =>
		$timePreference === 'Local' ? 'Local Time' : 'UTC Time'
	);

	function toggleTimePreference() {
		timePreference.set($timePreference === 'UTC' ? 'Local' : 'UTC');
	}

	function handleTrack(jamId: string) {
		trackedJams.add(jamId);
	}

	function handleUntrack(jamId: string) {
		trackedJams.remove(jamId);
	}
</script>

<div
	class="bg-background text-foreground mx-auto flex h-screen max-w-7xl flex-col space-y-6 p-4 md:space-y-8 md:p-6 lg:p-8"
>
	<!-- Header Section -->
	<header class="flex items-center gap-4">
		<h1 class="text-chart-1 mb-4 text-2xl font-bold md:text-3xl">Itch Jam Tracker</h1>
		<InfoButtons />
		<div class="flex items-center gap-2">
			<Switch
				id="time-preference"
				checked={$timePreference === 'Local'}
				onclick={toggleTimePreference}
			/>
			<Label for="time-preference">{timePreferenceLabel()}</Label>
		</div>
	</header>

	<div class="grid flex-grow grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
		<!-- Left Column -->
		<div class="flex flex-col gap-6">
			<h3 class="mb-2 text-lg font-semibold">Search</h3>
			<Input type="text" placeholder="Search for a jam..." />

			<Card class="flex flex-grow flex-col">
				<CardHeader>
					<CardTitle>Tracked Jams ({trackedJamsList().length})</CardTitle>
				</CardHeader>
				<ScrollArea class="max-h-[512px] flex-grow">
					<div class="p-4">
						{#if trackedJamsList().length > 0}
							{#each trackedJamsList() as jam (jam.id)}
								<JamListItem
									{jam}
									actionType="untrack"
									onAction={() => handleUntrack(jam.id.toString())}
								/>
							{/each}
						{:else}
							<div class="text-muted-foreground flex flex-col items-center justify-center p-4">
								<span class="mb-2 text-5xl">😔</span>
								<p>No tracked jams yet for this category.</p>
								<p>Start tracking some jams to see them here!</p>
							</div>
						{/if}
					</div>
					<ScrollAreaScrollbar orientation="vertical" />
				</ScrollArea>
			</Card>
		</div>

		<!-- Right Column -->
		<div class="flex flex-col gap-6">
			<h3 class="mb-2 text-lg font-semibold">Category</h3>
			<div class="mb-2">
				<select
					class="bg-card text-card-foreground border-border focus:ring-primary rounded border px-3 py-2 focus:ring-2 focus:outline-none"
					bind:value={selectedCategory}
					onchange={() => fetchJamsByCategory(selectedCategory)}
				>
					{#each JAM_STATUSES as status}
						<option value={status}>
							{status === 'all'
								? 'All'
								: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
						</option>
					{/each}
				</select>
			</div>

			<Card bind:ref={untrackedJamsContainer} class="flex flex-grow flex-col">
				<CardHeader>
					<CardTitle>Untracked Jams</CardTitle>
				</CardHeader>
				<ScrollArea bind:ref={untrackedJamsContent} class="max-h-[512px] flex-grow">
					<div class="p-4">
						{#each untrackedJams() as jam (jam.id)}
							<JamListItem
								{jam}
								actionType="track"
								onAction={() => handleTrack(jam.id.toString())}
							/>
						{/each}
						{#if isLoading}
							<div class="text-muted-foreground flex justify-center p-4">Loading jams...</div>
						{:else if !hasMore}
							<div class="text-muted-foreground flex justify-center p-4">No more jams to load.</div>
						{/if}
						{#if hasMore}
							<div bind:this={sentinel} style="height: 1px;"></div>
						{/if}
					</div>
					<ScrollAreaScrollbar orientation="vertical" />
				</ScrollArea>
			</Card>
		</div>
	</div>
</div>
