<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { timePreference } from '$lib/stores/timePreference';

	type Jam = {
		id: string;
		title: string;
		start_date: Date | null;
		end_date: Date | null;
		jamPageUrl: string;
		submissionCount: number;
		participatingUsers: number;
		bannerImage: string | null;
		featured: boolean;
		status: 'upcoming' | 'in-progress' | 'voting' | 'ended';
		createdAt: Date;
		updatedAt: Date;
	};

	const { jam, onAction, buttonText } = $props<{
		jam: Jam;
		onAction: (id: string) => void;
		buttonText: string;
	}>();

	let currentPreference = $derived($timePreference);

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

	const getStatusText = (status: Jam['status'], start_date: Date | null, end_date: Date | null) => {
		const statusMap: Record<Jam['status'], string> = {
			upcoming: 'Starts in',
			'in-progress': 'Submission closes in',
			voting: 'Voting ends in',
			ended: 'Ended'
		};

		const displayStatus = statusMap[status] || 'Unknown';

		if (status === 'upcoming' && start_date) {
			return `${displayStatus} ${formatDateTime(start_date)}`;
		} else if (status === 'ended' && end_date) {
			return `${displayStatus} ${formatDateTime(end_date)}`;
		} else if (status === 'voting' && end_date) {
			return `${displayStatus} ${formatDateTime(end_date)}`;
		} else {
			return displayStatus;
		}
	};
</script>

<Card class="w-[350px]">
	<CardHeader>
		<CardTitle>
			<a href={jam.jamPageUrl} target="_blank" rel="noopener noreferrer" class="hover:underline">
				{jam.title}
			</a>
		</CardTitle>
	</CardHeader>
	<CardContent>
		<p>Submissions: {jam.submissionCount}</p>
		<p>Participants: {jam.participatingUsers}</p>
		{#if jam.status === 'upcoming'}
			<p>Starts: {formatDateTime(jam.start_date)}</p>
		{/if}
		<p>Ends: {formatDateTime(jam.end_date)}</p>
		<p>{getStatusText(jam.status, jam.start_date, jam.end_date)}</p>
	</CardContent>
	<CardFooter>
		<Button onclick={() => onAction(jam.id)} class="w-full">{buttonText}</Button>
	</CardFooter>
</Card>
