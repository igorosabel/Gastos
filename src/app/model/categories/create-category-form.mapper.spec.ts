import createCategoryRequest from '@model/categories/create-category-form.mapper';
import type CreateCategoryFormModel from '@model/categories/create-category-form.model';
import { describe, expect, it } from 'vitest';

describe('createCategoryRequest', (): void => {
  it('crea una categoría principal', (): void => {
    const model: CreateCategoryFormModel = {
      name: '  Hogar  ',
      defaultType: 'expense',
      parentId: null,
    };

    expect(createCategoryRequest(model, 8)).toEqual({
      spaceId: 8,
      name: 'Hogar',
      defaultType: 'expense',
      parentId: null,
      sortOrder: 0,
    });
  });

  it('crea una subcategoría de ingresos', (): void => {
    const model: CreateCategoryFormModel = {
      name: 'Intereses',
      defaultType: 'income',
      parentId: 15,
    };

    expect(createCategoryRequest(model, 8)).toEqual({
      spaceId: 8,
      name: 'Intereses',
      defaultType: 'income',
      parentId: 15,
      sortOrder: 0,
    });
  });
});
