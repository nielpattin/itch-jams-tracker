<script lang="ts">
	import { onMount } from 'svelte';
	import InfoButtons from '$lib/components/InfoButtons.svelte';
	import { authClient } from '$lib/auth-client';
	import { Input } from '$lib/components/ui/input';
	import JamListItem from '$lib/components/JamListItem.svelte';
	import { trackedJams } from '$lib/stores/trackedJams';
	import { timePreference } from '$lib/stores/timePreference';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import type { jam as jamSchema } from '$lib/server/db/schema';
	import { getJamIdsSet } from '$lib/utils';
	import { ChevronDown, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	type Jam = typeof jamSchema.$inferSelect & { category: JamStatusFilter };

	let { data } = $props();
	let jams = $state(data.jams);
	let hasMore = $state(data.hasMore);
	let nextOffset = $state(data.nextOffset);
	let isLoading = $state(false);
	let SEARCH_TERM_KEY = 'itchjam-search-term';
	let searchTerm = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout>;
	let ready = $state(false);
	let showProgressModal = $state(false);
	let fadeIn = $state(false);
	let progress = $state(0);
	let progressInterval: ReturnType<typeof setInterval> | null = null;
	let progressDone = $state(false);
	let loadingDone = $state(false);
	let readyToFade = $state(false);

	const TIME_PREF_KEY = 'itchjam-time-preference';
	let isLocal = $state(false);

	let isAdmin = $state(false);

	onMount(async () => {
		const session = await authClient.getSession();
		isAdmin = !!session?.data?.user.role && session.data.user.role === 'admin';
	});

	const PROGRESS_ANIMATION_DURATION = 300; // ms, how long the bar takes to fill
	const PROGRESS_WAIT_AFTER_100 = 200; // ms, how long to wait after 100% before fade out

	onMount(() => {
		const stored = localStorage.getItem(TIME_PREF_KEY);
		if (stored === 'Local' || stored === 'UTC') {
			timePreference.set(stored);
		}
	});

	$effect(() => {
		isLocal = $timePreference === 'Local';
		localStorage.setItem(TIME_PREF_KEY, $timePreference);
	});
	// ------------------------------------------------

	// Category filter state
	const JAM_STATUSES = ['all', 'upcoming', 'in-progress', 'voting', 'ended'] as const;
	type JamStatusFilter = (typeof JAM_STATUSES)[number] | null;
	let CATEGORY_KEY = 'itchjam-category';
	let selectedCategory = $state<JamStatusFilter>(data.initialCategory as JamStatusFilter);

	let trackedJamIds = $state(new Set<string>());
	let trackedJamsData = $state<Jam[]>([]);

	const trackedJamsList = $derived(() => {
		const filtered = trackedJamsData.filter(
			(jam: Jam) =>
				trackedJamIds.has(jam.id) &&
				(selectedCategory === 'all' || jam.category === selectedCategory) &&
				jam.title.toLowerCase().includes(searchTerm.toLowerCase())
		);
		return filtered;
	});
	const untrackedJams = $derived(() => {
		const filtered = jams.filter(
			(jam: Jam) =>
				!trackedJamIds.has(jam.id) &&
				(selectedCategory === 'all' || jam.category === selectedCategory) &&
				jam.title.toLowerCase().includes(searchTerm.toLowerCase())
		);
		return filtered;
	});

	// Fetch jams from server when category changes
	async function fetchJams(category: JamStatusFilter, search: string = '') {
		isLoading = true;
		try {
			let url = `/jams?limit=10&offset=0`;
			if (search) {
				url += `&search=${search}`;
				// When searching, always fetch all categories from backend, then filter on frontend
				// This ensures category filter applies on top of search results
				url += `&category=all`;
			} else if (category && category !== 'all') {
				url += `&category=${category}`;
			} else {
				// If no search and category is 'all' or null, explicitly set category to 'all' for backend
				url += `&category=all`;
			}
			const response = await fetch(url, {
				cache: 'no-store'
			});
			const newData = await response.json();
			jams = newData.jams;
			hasMore = newData.hasMore;
			nextOffset = newData.nextOffset;

			// Only set cookie if a specific category is selected and no search term is active
			if (category && category !== 'all' && !search) {
				document.cookie = `${CATEGORY_KEY}=${category};path=/;max-age=${60 * 60 * 24 * 7}`; // Set cookie for 7 days
			} else if (search) {
				// If search is active, ensure the cookie reflects 'all' or is cleared
				document.cookie = `${CATEGORY_KEY}=all;path=/;max-age=${60 * 60 * 24 * 7}`;
			}

			// Explicitly re-initialize and observe the sentinel after new data is loaded
			if (observer) {
				observer.disconnect();
				observer = null; // Clear the old observer
			}
			// Wait for next tick to ensure DOM is updated with new jams and sentinel
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Reset scroll position to top
			if (untrackedJamsContent) {
				untrackedJamsContent.scrollTop = 0;
			}

			if (sentinel && untrackedJamsContent) {
				observer = new IntersectionObserver(
					(entries) => {
						for (const entry of entries) {
							if (entry.isIntersecting) {
								if (hasMore && !isLoading) {
									loadMoreJams();
								}
							}
						}
					},
					{ root: untrackedJamsContent, rootMargin: '0px 0px 400px 0px', threshold: 0 }
				);
				observer.observe(sentinel);
			}
		} catch (error) {
			console.error('Error fetching jams:', error);
		} finally {
			isLoading = false;
			ready = true;
		}
	}

	const loadMoreJams = async () => {
		if (!hasMore || isLoading) return;
		isLoading = true;
		try {
			let url = `/jams?limit=10&offset=${nextOffset}`;
			if (searchTerm) {
				url += `&search=${searchTerm}`;
				url += `&category=all`; // Always fetch all categories from backend when searching
			} else if (selectedCategory && selectedCategory !== 'all') {
				url += `&category=${selectedCategory}`;
			} else {
				url += `&category=all`;
			}
			const response = await fetch(url, {
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
	let untrackedJamsContent = $state<HTMLDivElement | null>(null);

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
		ready = false;
		let hasPersisted =
			localStorage.getItem(SEARCH_TERM_KEY) !== null ||
			localStorage.getItem(TIME_PREF_KEY) !== null ||
			localStorage.getItem(CATEGORY_KEY) !== null;

		// Hydrate tracked jams from local storage immediately on mount
		trackedJams.hydrate();

		// Restore time preference from localStorage
		const storedTime = localStorage.getItem(TIME_PREF_KEY);
		if (storedTime === 'Local' || storedTime === 'UTC') {
			timePreference.set(storedTime);
		}

		// Restore category from cookie/localStorage
		let restoredCategory = null;
		const cookieMatch = document.cookie.match(/(?:^|;\s*)itchjam-category=([^;]*)/);
		if (cookieMatch && cookieMatch[1]) {
			restoredCategory = decodeURIComponent(cookieMatch[1]);
		} else {
			const storedCategory = localStorage.getItem(CATEGORY_KEY);
			if (storedCategory) restoredCategory = storedCategory;
		}
		if (
			typeof restoredCategory === 'string' &&
			JAM_STATUSES.includes(restoredCategory as (typeof JAM_STATUSES)[number])
		) {
			selectedCategory = restoredCategory as JamStatusFilter;
		}

		// Restore search term from localStorage
		const storedSearch = localStorage.getItem(SEARCH_TERM_KEY);
		if (storedSearch !== null) {
			searchTerm = storedSearch;
		}

		// Always show the main layout first, then show the modal after a tick
		setTimeout(() => {
			showProgressModal = true;
			progress = 0;
			progressDone = false;
			loadingDone = false;
			readyToFade = false;
			if (progressInterval) clearInterval(progressInterval);
			const start = Date.now();
			progressInterval = setInterval(() => {
				const elapsed = Date.now() - start;
				const percent = Math.min(100, (elapsed / PROGRESS_ANIMATION_DURATION) * 100);
				progress = percent;
				if (percent >= 100) {
					progress = 100;
					progressDone = true;
					clearInterval(progressInterval!);
					progressInterval = null;
					// Wait for the bar to visually reach 100% (transition), then start the wait
					setTimeout(() => {
						setTimeout(() => {
							fadeIn = true;
							setTimeout(() => {
								showProgressModal = false;
							}, 500);
						}, PROGRESS_WAIT_AFTER_100);
					}, PROGRESS_ANIMATION_DURATION);
				}
			}, 16);

			setTimeout(() => {
				if (hasPersisted) {
					jams = [];
					fetchJams(selectedCategory, searchTerm).then(() => {
						loadingDone = true;
						// Don't do anything here - let the progress bar control fade-out
					});
				} else {
					showProgressModal = false;
					ready = true;
					fadeIn = true;
				}
			}, 200); // slight delay for UX
		}, 0);

		// Set up IntersectionObserver for infinite scroll
		if (sentinel && untrackedJamsContent) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							// Fetch more jams if there are more to load and not currently loading
							if (hasMore && !isLoading) {
								loadMoreJams();
							}
						}
					}
				},
				{ root: untrackedJamsContent, rootMargin: '0px 0px 400px 0px', threshold: 0 }
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
		const currentTrackedDataIds = getJamIdsSet(trackedJamsData);
		return Array.from(trackedJamIds).filter((id) => !currentTrackedDataIds.has(id));
	});

	// Effect to fetch missing tracked jams and populate trackedJamsData
	$effect(() => {
		if (missingTrackedJamIds().length > 0) {
			fetchJamsByIds(missingTrackedJamIds()).then((fetchedJams) => {
				// Only add new jams if they are not already present in trackedJamsData
				const existingTrackedIds = getJamIdsSet(trackedJamsData);
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

	const timePreferenceLabel = $derived(() =>
		$timePreference === 'Local' ? 'Local Time' : 'UTC Time'
	);

	function handleSwitchChange() {
		timePreference.set(isLocal ? 'UTC' : 'Local');
	}

	function handleTrack(jamId: string) {
		trackedJams.add(jamId);
	}

	function handleUntrack(jamId: string) {
		trackedJams.remove(jamId);
	}
</script>

{#if !showProgressModal && fadeIn}
	<div
		class="bg-background text-foreground mx-auto flex min-h-screen max-w-7xl flex-col space-y-6 p-4 transition-opacity duration-500 md:space-y-8 md:p-6 lg:p-8"
	>
		<!-- Header Section -->
		<header class="flex items-center gap-4">
			<h1 class="text-foreground text-2xl font-bold md:text-3xl">Itch Jam Tracker</h1>
			<InfoButtons />
			{#if isAdmin}
				<a href="/admin">
					<Button
						class="bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground ml-2 cursor-pointer rounded border px-4 py-2 font-medium shadow transition-colors"
						>Admin Page</Button
					>
				</a>
			{/if}
			<div class="ml-auto flex items-center gap-2">
				<Switch id="time-preference" bind:checked={isLocal} onclick={handleSwitchChange} />
				<Label for="time-preference">{timePreferenceLabel()}</Label>
			</div>
		</header>

		<div class="grid flex-grow grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
			<!-- Left Column -->
			<div class="flex flex-col gap-6">
				<h3 class="mb-2 text-lg font-semibold">Search</h3>
				<div class="relative w-full">
					<Input
						type="text"
						placeholder="Search for a jam..."
						class="bg-card text-card-foreground border-border focus:ring-primary w-full rounded border-0 px-4 py-2 pr-10 focus:ring-2 focus:outline-none"
						bind:value={searchTerm}
						oninput={() => {
							localStorage.setItem(SEARCH_TERM_KEY, searchTerm);
							clearTimeout(debounceTimeout);
							debounceTimeout = setTimeout(() => {
								// If there's a search term, automatically switch to 'all' category
								// but allow user to re-select other categories for further filtering
								if (searchTerm) {
									selectedCategory = 'all';
								}
								fetchJams(selectedCategory, searchTerm);
							}, 500); // 500ms debounce
						}}
					/>
					{#if searchTerm}
						<button
							type="button"
							class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors"
							onclick={() => {
								searchTerm = '';
								localStorage.setItem(SEARCH_TERM_KEY, '');
								fetchJams(selectedCategory, '');
							}}
							aria-label="Clear search"
						>
							<X class="size-5" />
						</button>
					{/if}
				</div>

				<div class="flex flex-grow flex-col">
					<div class="px-0 pb-2">
						<h2 class="text-lg font-semibold">Tracked Jams ({trackedJamsList().length})</h2>
					</div>
					<div
						class="bg-background border-border max-h-[calc(100vh-350px)] overflow-y-auto rounded-lg border"
					>
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
								<div class="text-muted-foreground flex justify-center p-4">No tracked jams.</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Right Column -->
			<div class="flex flex-col gap-6">
				<h3 class="mb-2 text-lg font-semibold">Category</h3>
				<div class="relative mb-2">
					<select
						class="bg-card text-card-foreground border-border focus:ring-primary w-full appearance-none rounded border px-4 py-2 pr-10 focus:ring-2 focus:outline-none"
						bind:value={selectedCategory}
						onchange={() => fetchJams(selectedCategory, searchTerm)}
					>
						{#each JAM_STATUSES as status}
							<option value={status}>
								{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
							</option>
						{/each}
					</select>
					<div
						class="text-card-foreground pointer-events-none absolute inset-y-0 right-0 flex items-center px-2"
					>
						<ChevronDown class="size-4" />
					</div>
				</div>

				<div class="flex flex-grow flex-col">
					<div class="px-0 pb-2">
						<h2 class="text-lg font-semibold">Untracked Jams</h2>
					</div>
					<div
						class="bg-background border-border max-h-[calc(100vh-350px)] overflow-y-auto rounded-lg border"
						bind:this={untrackedJamsContent}
					>
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
								<div class="text-muted-foreground flex justify-center p-4">
									No more jams to load.
								</div>
							{/if}
							{#if hasMore}
								<div bind:this={sentinel} style="height: 1px;"></div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
{#if showProgressModal}
	<div
		class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500"
		style="opacity: {fadeIn ? 0 : 1}; pointer-events: {fadeIn ? 'none' : 'auto'};"
	>
		<div class="bg-card flex w-full max-w-lg flex-col items-center rounded p-6 shadow-lg">
			<div class="mb-4 w-full">
				<div class="bg-muted h-2 w-full rounded">
					<div
						class="bg-primary h-2 rounded"
						style="width: {progress}%; transition: width {PROGRESS_ANIMATION_DURATION}ms linear;"
					></div>
				</div>
			</div>
			<span class="text-card-foreground flex items-center gap-2 font-medium">
				Loading your preferences...
				<span class="text-muted-foreground ml-2 font-mono text-xs"
					>{Math.round((progress / 100) * 100)}%</span
				>
			</span>
		</div>
	</div>
{/if}
