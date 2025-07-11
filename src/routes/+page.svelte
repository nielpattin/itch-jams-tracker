<script lang="ts">
	import { onMount } from 'svelte';
	import { authClient } from '$lib/auth-client';
	import { trackedJams } from '$lib/stores/trackedJams';
	import { timePreference } from '$lib/stores/timePreference';
	import type { jam as jamSchema } from '$lib/server/db/schema';
	import { getJamIdsSet } from '$lib/utils';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SearchSection from '$lib/components/SearchSection.svelte';
	import CategoryFilter from '$lib/components/CategoryFilter.svelte';
	import TrackedJamsSection from '$lib/components/TrackedJamsSection.svelte';
	import UntrackedJamsSection from '$lib/components/UntrackedJamsSection.svelte';
	import LoadingModal from '$lib/components/LoadingModal.svelte';

	type Jam = typeof jamSchema.$inferSelect & { category: JamStatusFilter };

	let { data } = $props();
	let jams = $state(data.jams);
	let hasMore = $state(data.hasMore);
	let currentPage = $state(1); // New state variable for current page
	let isLoading = $state(false);
	let searchTerm = $state('');
	let ready = $state(false);
	let showProgressModal = $state(false);
	let fadeIn = $state(false);
	let progress = $state(0);
	let progressInterval: ReturnType<typeof setInterval> | null = null;
	let progressDone = $state(false);
	let loadingDone = $state(false);
	let readyToFade = $state(false);

	const TIME_PREF_KEY = 'itchjam-time-preference';
	let isAdmin = $state(false);

	onMount(async () => {
		const session = await authClient.getSession();
		isAdmin = !!session?.data?.user.role && session.data.user.role === 'admin';
	});

	const PROGRESS_ANIMATION_DURATION = 300;
	const PROGRESS_WAIT_AFTER_100 = 200;

	onMount(() => {
		const stored = localStorage.getItem(TIME_PREF_KEY);
		if (stored === 'Local' || stored === 'UTC') {
			timePreference.set(stored);
		}
		// Persist timePreference changes to localStorage
		timePreference.subscribe((val) => {
			if (val === 'Local' || val === 'UTC') {
				localStorage.setItem(TIME_PREF_KEY, val);
			}
		});
	});

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
			let url = `/jams?page=1`;
			if (search) {
				url += `&search=${search}`;
				url += `&category=all`;
			} else if (category && category !== 'all') {
				url += `&category=${category}`;
			} else {
				url += `&category=all`;
			}
			const response = await fetch(url, {
				cache: 'no-store'
			});
			const newData = await response.json();
			jams = newData.jams;
			hasMore = newData.hasMore;
			currentPage = 1; // Reset to page 1 for new fetch

			// Store category in localStorage only (no cookie needed)
			if (category && category !== 'all' && !search) {
				localStorage.setItem(CATEGORY_KEY, category);
			} else if (search || category === 'all') {
				localStorage.setItem(CATEGORY_KEY, 'all');
			}

			if (observer) {
				observer.disconnect();
				observer = null;
			}
			// Reset scroll position after fetching jams
			if (untrackedJamsContent) {
				untrackedJamsContent.scrollTop = 0;
			}

			// Remove observer setup from here to handle in onMount
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
			const nextPage = currentPage + 1;
			let url = `/jams?page=${nextPage}`;
			if (searchTerm) {
				url += `&search=${searchTerm}`;
				url += `&category=all`;
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
			currentPage = nextPage; // Increment page number
			hasMore = newData.hasMore;
		} catch (error) {
			console.error('Error loading more jams:', error);
		} finally {
			isLoading = false;
		}
	};

	let sentinel = $state<HTMLDivElement | null>(null);
	let untrackedJamsContent = $state<HTMLDivElement | null>(null);
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
			localStorage.getItem('itchjam-search-term') !== null ||
			localStorage.getItem(TIME_PREF_KEY) !== null ||
			localStorage.getItem(CATEGORY_KEY) !== null;

		trackedJams.hydrate();

		const storedTime = localStorage.getItem(TIME_PREF_KEY);
		if (storedTime === 'Local' || storedTime === 'UTC') {
			timePreference.set(storedTime);
		}

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

		const storedSearch = localStorage.getItem('itchjam-search-term');
		if (storedSearch !== null) {
			searchTerm = storedSearch;
		}

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
					});
				} else {
					showProgressModal = false;
					ready = true;
					fadeIn = true;
				}
			}, 200);
		}, 0);

		// Set up IntersectionObserver after component is mounted
		$effect(() => {
			if (!untrackedJamsContent || !sentinel) return;

			// Ensure observer is disconnected before creating a new one
			if (observer) {
				observer.disconnect();
			}

			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting && hasMore && !isLoading) {
							loadMoreJams();
						}
					}
				},
				{ root: untrackedJamsContent, rootMargin: '0px 0px 400px 0px', threshold: 0 }
			);
			observer.observe(sentinel);

			return () => {
				if (observer) {
					observer.disconnect();
				}
			};
		});
	});

	$effect(() => {
		trackedJams.subscribe((ids) => {
			trackedJamIds = new Set(ids);
		});
	});

	const missingTrackedJamIds = $derived(() => {
		const currentTrackedDataIds = getJamIdsSet(trackedJamsData);
		return Array.from(trackedJamIds).filter((id) => !currentTrackedDataIds.has(id));
	});

	$effect(() => {
		if (missingTrackedJamIds().length > 0) {
			fetchJamsByIds(missingTrackedJamIds()).then((fetchedJams) => {
				const existingTrackedIds = getJamIdsSet(trackedJamsData);
				const newJamsToAdd = fetchedJams.filter((jam: Jam) => !existingTrackedIds.has(jam.id));
				if (newJamsToAdd.length > 0) {
					trackedJamsData = [...trackedJamsData, ...newJamsToAdd];
				} else if (fetchedJams.length === 0 && missingTrackedJamIds().length > 0) {
					missingTrackedJamIds().forEach((id) => trackedJams.remove(id));
				}
			});
		}
	});

	function handleTrack(jamId: string) {
		trackedJams.add(jamId);
	}

	function handleUntrack(jamId: string) {
		trackedJams.remove(jamId);
	}

	function handleSearch(term: string) {
		if (term) {
			selectedCategory = 'all';
		}
		fetchJams(selectedCategory, term);
	}

	function handleSearchClear() {
		fetchJams(selectedCategory, '');
	}

	function handleCategoryChange(category: JamStatusFilter) {
		selectedCategory = category;
		fetchJams(category, searchTerm);
	}
</script>

{#if !showProgressModal && fadeIn}
	<div
		class="bg-background text-foreground mx-auto flex min-h-screen max-w-7xl flex-col space-y-6 p-4 transition-opacity duration-500 md:space-y-8 md:p-6 lg:p-8"
	>
		<PageHeader {isAdmin} />

		<!-- Filters Row -->
		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<SearchSection bind:searchTerm onSearch={handleSearch} onClear={handleSearchClear} />
			<CategoryFilter bind:selectedCategory onCategoryChange={handleCategoryChange} />
		</div>

		<!-- Jams Row -->
		<div class="grid flex-grow grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
			<TrackedJamsSection trackedJams={trackedJamsList()} onUntrack={handleUntrack} />
			<UntrackedJamsSection
				untrackedJams={untrackedJams()}
				{isLoading}
				{hasMore}
				onTrack={handleTrack}
				bind:sentinel
				bind:untrackedJamsContent
			/>
		</div>
	</div>
{/if}

<LoadingModal
	{showProgressModal}
	{fadeIn}
	{progress}
	progressAnimationDuration={PROGRESS_ANIMATION_DURATION}
/>
