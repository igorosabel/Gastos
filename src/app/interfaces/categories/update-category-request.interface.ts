export default interface UpdateCategoryRequest {
  spaceId: number;
  categoryId: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
}
