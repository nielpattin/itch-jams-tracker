<script lang="ts">
	import InfoButtons from '$lib/components/InfoButtons.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import JamCard from '$lib/components/JamCard.svelte';
	import { trackedJams } from '$lib/stores/trackedJams';

	let { data } = $props();

	const trackedJamsList = $derived(data.jams.filter((jam) => $trackedJams.includes(jam.id)));
	const untrackedJamsList = $derived(data.jams.filter((jam) => !$trackedJams.includes(jam.id)));

	function handleTrackJam(jamId: string) {
		trackedJams.add(jamId);
	}

	function handleUntrackJam(jamId: string) {
		trackedJams.remove(jamId);
	}
</script>

<div
	class="bg-background text-foreground mx-auto min-h-screen max-w-7xl space-y-6 p-4 md:space-y-8 md:p-6 lg:p-8"
>
	<!-- Header Section -->
	<header class="flex items-start justify-between">
		<h1 class="text-chart-1 mb-4 text-2xl font-bold md:text-3xl">Itch Jam Tracker</h1>
		<div
			class="bg-muted flex min-h-[2.25rem] flex-col justify-center rounded px-2 text-xs shadow-lg"
		>
			<p>v0.1.0</p>
			<p>Updated: 2024-07-30</p>
		</div>
		<Button class="min-h-[2.25rem] rounded px-2 text-xs" variant="default">UTC</Button>
	</header>

	<!-- Search and Category Selection Section -->
	<section class="mb-6 flex items-center justify-between gap-4">
		<Card class="flex-1">
			<CardHeader>
				<CardTitle>Search</CardTitle>
			</CardHeader>
			<CardContent>
				<Input type="text" placeholder="Search for a jam..." />
			</CardContent>
		</Card>
		<Card class="flex-1">
			<CardHeader>
				<CardTitle>Category</CardTitle>
			</CardHeader>
			<CardContent>Category Select will go here</CardContent>
		</Card>
	</section>

	<!-- Tab Navigation (Mobile Only) -->
	<section class="mb-4 md:hidden">
		<Tabs value="tracked" class="w-full">
			<TabsList class="grid w-full grid-cols-2">
				<TabsTrigger value="tracked">Tracked Jams</TabsTrigger>
				<TabsTrigger value="untracked">Untracked Jams</TabsTrigger>
			</TabsList>
			<TabsContent value="tracked">
				<Card>
					<CardHeader>
						<CardTitle>Tracked Jams</CardTitle>
					</CardHeader>
					<CardContent>
						{#if trackedJamsList.length > 0}
							{#each trackedJamsList as jam}
								<JamCard {jam} onAction={handleUntrackJam} buttonText="Untrack" />
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
			</TabsContent>
			<TabsContent value="untracked">
				<Card>
					<CardHeader>
						<CardTitle>Untracked Jams</CardTitle>
					</CardHeader>
					<CardContent>
						{#each untrackedJamsList as jam}
							<JamCard {jam} onAction={handleTrackJam} buttonText="Track" />
						{/each}
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	</section>

	<!-- Jam Lists Section (Desktop/Tablet View) -->
	<section class="hidden grid-cols-1 gap-6 md:grid md:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Tracked Jams</CardTitle>
			</CardHeader>
			<CardContent>
				{#if trackedJamsList.length > 0}
					{#each trackedJamsList as jam}
						<JamCard {jam} onAction={handleUntrackJam} buttonText="Untrack" />
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
		<Card>
			<CardHeader>
				<CardTitle>Untracked Jams</CardTitle>
			</CardHeader>
			<CardContent>
				{#each untrackedJamsList as jam}
					<JamCard {jam} onAction={handleTrackJam} buttonText="Track" />
				{/each}
			</CardContent>
		</Card>
	</section>
	<InfoButtons />
</div>
