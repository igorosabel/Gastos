export default interface CreateCategoryFormModel {
  name: string;
  defaultType: 'income' | 'expense';
  parentId: number | null;
}
