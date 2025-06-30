<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	type Jam = {
		id: string;
		title: string;
		startDate: Date;
		endDate: Date;
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

	const formatDateTime = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			hour12: true
		}).format(date);
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
		<p>Starts: {formatDateTime(jam.startDate)}</p>
		<p>Ends: {formatDateTime(jam.endDate)}</p>
	</CardContent>
	<CardFooter>
		<Button onclick={() => onAction(jam.id)} class="w-full">{buttonText}</Button>
	</CardFooter>
</Card>
