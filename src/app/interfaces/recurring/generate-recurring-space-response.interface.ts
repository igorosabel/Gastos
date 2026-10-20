import type { ApiResponse } from '@interfaces/auth.interfaces';

export default interface GenerateRecurringSpaceResponse extends ApiResponse {
  created: number;
  existing: number;
  skipped: number;
  total: number;
}
