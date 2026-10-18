import type CreateCategoryRequest from '@interfaces/categories/create-category-request.interface';
import type CreateCategoryFormModel from '@model/categories/create-category-form.model';

export default function createCategoryRequest(
  model: CreateCategoryFormModel,
  spaceId: number,
): CreateCategoryRequest {
  return {
    spaceId,
    name: model.name.trim(),
    defaultType: model.defaultType,
    parentId: model.parentId,
    sortOrder: 0,
  };
}
