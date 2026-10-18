import type CreateCategoryFormModel from '@model/categories/create-category-form.model';

export default function createCategoryFormInitialValue(): CreateCategoryFormModel {
  return {
    name: '',
    defaultType: 'expense',
    parentId: null,
  };
}
