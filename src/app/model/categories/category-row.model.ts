import type Category from '@model/categories/category.model';

export default interface CategoryRow {
  category: Category;
  depth: number;
  parentName: string | null;
}
