export default interface ResolveRecurringOccurrenceRequest {
  spaceId: number;
  occurrenceId: number;
  action: 'confirm' | 'skip';
}
