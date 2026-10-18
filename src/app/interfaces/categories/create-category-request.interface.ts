export default interface CreateCategoryRequest {
  spaceId: number;
  name: string;
  defaultType: 'income' | 'expense';
  parentId: number | null;
  sortOrder: number;
}
