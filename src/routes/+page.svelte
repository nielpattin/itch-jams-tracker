<script lang="ts">
	import InfoButtons from '$lib/components/InfoButtons.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import JamListItem from '$lib/components/JamListItem.svelte';
	import { trackedJams } from '$lib/stores/trackedJams';
	import { timePreference } from '$lib/stores/timePreference';
	import type { jam as jamSchema } from '$lib/server/db/schema';

	type Jam = typeof jamSchema.$inferSelect;

	let { data } = $props();
	let jams = $state(data.jams);
	let nextOffset = $state(data.nextOffset);
	let hasMore = $state(data.hasMore);
	let isLoading = $state(false);

	// Always up-to-date derived lists
	let trackedJamsList = $state([] as Jam[]);
	let untrackedJams = $state([] as Jam[]);

	$effect(() => {
		trackedJamsList = jams.filter((jam: Jam) => $trackedJams.includes(jam.id));
		untrackedJams = jams.filter((jam: Jam) => !$trackedJams.includes(jam.id));
	});

	const loadMoreJams = async () => {
		if (!hasMore || isLoading) return;
		isLoading = true;
		try {
			const response = await fetch(`/jams?limit=8&offset=${nextOffset}`, {
				cache: 'no-store'
			});
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

	// IntersectionObserver setup/cleanup
	$effect(() => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						loadMoreJams();
					}
				}
			},
			{ root: null, rootMargin: '0px', threshold: 1.0 }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});

	function toggleTimePreference() {
		timePreference.set($timePreference === 'UTC' ? 'Local' : 'UTC');
	}

	// Hydrate tracked jams after hydration
	$effect(() => {
		if (typeof window !== 'undefined' && trackedJams.hydrate) {
			trackedJams.hydrate();
		}
	});
</script>

<div
	class="bg-background text-foreground mx-auto flex h-screen max-w-7xl flex-col space-y-6 p-4 md:space-y-8 md:p-6 lg:p-8"
>
	<!-- Header Section -->
	<header class="flex items-center gap-4">
		<h1 class="text-chart-1 mb-4 text-2xl font-bold md:text-3xl">Itch Jam Tracker</h1>
		<InfoButtons />
		<div class="flex flex-col items-end">
			<div
				class="bg-muted flex min-h-[2.25rem] flex-col justify-center rounded px-2 text-xs shadow-lg"
			>
				<p>v0.1.0</p>
				<p>Updated: 2024-07-30</p>
			</div>
			<Button
				class="min-h-[2.25rem] rounded px-2 text-xs"
				variant="default"
				onclick={toggleTimePreference}>{$timePreference}</Button
			>
		</div>
	</header>

	<div class="grid flex-grow grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
		<!-- Left Column -->
		<div class="flex flex-col gap-6">
			<h3 class="mb-2 text-lg font-semibold">Search</h3>
			<Input type="text" placeholder="Search for a jam..." />

			<div class="max-h-[calc(100vh-20rem)] flex-grow overflow-y-auto">
				<Card>
					<CardHeader>
						<CardTitle>Tracked Jams ({trackedJamsList.length})</CardTitle>
					</CardHeader>
					<CardContent>
						{#if trackedJamsList.length > 0}
							{#each trackedJamsList as jam (jam.id)}
								<JamListItem
									{jam}
									actionType="untrack"
									onAction={() => trackedJams.remove(jam.id)}
								/>
							{/each}
						{:else}
							<div class="text-muted-foreground flex flex-col items-center justify-center p-4">
								<span class="mb-2 text-5xl">😔</span>
								<p>No tracked jams yet.</p>
								<p>Start tracking some jams to see them here!</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Right Column -->
		<div class="flex flex-col gap-6">
			<h3 class="mb-2 text-lg font-semibold">Category</h3>
			Category Select will go here

			<div class="max-h-[calc(100vh-20rem)] flex-grow overflow-y-auto">
				<Card>
					<CardHeader>
						<CardTitle>Untracked Jams</CardTitle>
					</CardHeader>
					<CardContent>
						{#each untrackedJams as jam (jam.id)}
							<JamListItem {jam} actionType="track" onAction={() => trackedJams.add(jam.id)} />
						{/each}
						{#if isLoading}
							<div class="text-muted-foreground flex justify-center p-4">Loading more jams...</div>
						{:else if !hasMore}
							<div class="text-muted-foreground flex justify-center p-4">No more jams to load.</div>
						{/if}
						{#if hasMore}
							<div bind:this={sentinel} style="height: 1px;"></div>
						{/if}
					</CardContent>
				</Card>
			</div>
		</div>
	</div>
</div>
