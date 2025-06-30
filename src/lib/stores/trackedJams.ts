import { writable } from 'svelte/store';

const LOCAL_STORAGE_KEY = 'trackedJamIds';

function createTrackedJamsStore() {
	let initialValue: string[] = [];

	if (typeof window !== 'undefined') {
		const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (storedValue) {
			try {
				initialValue = JSON.parse(storedValue);
			} catch (e) {
				console.error('Failed to parse stored tracked jam IDs:', e);
				initialValue = [];
			}
		}
	}

	const { subscribe, set, update } = writable<string[]>(initialValue);

	function saveToLocalStorage(ids: string[]) {
		if (typeof window !== 'undefined') {
			localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
		}
	}

	return {
		subscribe,
		add: (jamId: string) => {
			update((currentIds) => {
				if (!currentIds.includes(jamId)) {
					const newIds = [...currentIds, jamId];
					saveToLocalStorage(newIds);
					return newIds;
				}
				return currentIds;
			});
		},
		remove: (jamId: string) => {
			update((currentIds) => {
				const newIds = currentIds.filter((id) => id !== jamId);
				saveToLocalStorage(newIds);
				return newIds;
			});
		},
		reset: () => {
			set([]);
			saveToLocalStorage([]);
		}
	};
}

export const trackedJams = createTrackedJamsStore();
