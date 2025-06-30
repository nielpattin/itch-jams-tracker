import { writable } from 'svelte/store';

export const timePreference = writable<'UTC' | 'Local'>('UTC');
