import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Category from '@model/categories/category.model';

export default interface CreateCategoryResponse extends ApiResponse {
  category: Category | null;
}
