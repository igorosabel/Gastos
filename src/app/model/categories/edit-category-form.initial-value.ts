import type Category from '@model/categories/category.model';
import type EditCategoryFormModel from '@model/categories/edit-category-form.model';

export default function editCategoryFormInitialValue(category: Category): EditCategoryFormModel {
  return {
    name: category.name,
    parentId: category.parent_id,
  };
}
