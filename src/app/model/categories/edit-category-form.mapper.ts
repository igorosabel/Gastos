import type UpdateCategoryRequest from '@interfaces/categories/update-category-request.interface';
import type Category from '@model/categories/category.model';
import type EditCategoryFormModel from '@model/categories/edit-category-form.model';

export default function editCategoryFormMapper(
  model: EditCategoryFormModel,
  category: Category,
): UpdateCategoryRequest {
  return {
    spaceId: category.space_id,
    categoryId: category.id,
    name: model.name.trim(),
    parentId: model.parentId,
    sortOrder: category.sort_order,
  };
}
