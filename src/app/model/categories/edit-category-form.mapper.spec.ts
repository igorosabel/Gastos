import type Category from '@model/categories/category.model';
import editCategoryFormInitialValue from '@model/categories/edit-category-form.initial-value';
import editCategoryFormMapper from '@model/categories/edit-category-form.mapper';
import type EditCategoryFormModel from '@model/categories/edit-category-form.model';
import { describe, expect, it } from 'vitest';

describe('Formulario de edición de categorías', (): void => {
  const category: Category = {
    id: 7,
    space_id: 12,
    parent_id: 3,
    name: 'Electricidad',
    default_type: 'expense',
    sort_order: 5,
  };

  it('inicializa el formulario con los valores existentes', (): void => {
    expect(editCategoryFormInitialValue(category)).toEqual({
      name: 'Electricidad',
      parentId: 3,
    });
  });

  it('prepara la petición conservando identificadores y orden', (): void => {
    const model: EditCategoryFormModel = {
      name: '  Luz  ',
      parentId: null,
    };

    expect(editCategoryFormMapper(model, category)).toEqual({
      spaceId: 12,
      categoryId: 7,
      name: 'Luz',
      parentId: null,
      sortOrder: 5,
    });
  });

  it('permite cambiar la categoría padre', (): void => {
    const model: EditCategoryFormModel = {
      name: 'Electricidad',
      parentId: 9,
    };

    expect(editCategoryFormMapper(model, category).parentId).toBe(9);
  });
});
