export default interface RecurringOccurrencesRequest {
  spaceId: number;
  periodFrom: string;
  periodTo: string;
  page: number;
  pageSize: number;
  status?: 'pending' | 'confirmed' | 'skipped';
}
