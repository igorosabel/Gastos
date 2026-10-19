import type Category from '@model/categories/category.model';
import transactionCategoryOptions from '@model/transactions/transaction-category-options.mapper';
import { describe, expect, it } from 'vitest';

describe('Opciones jerárquicas de movimientos', (): void => {
  const categories: Category[] = [
    {
      id: 3,
      space_id: 2,
      parent_id: 2,
      name: 'Fruta',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 1,
      space_id: 2,
      parent_id: null,
      name: 'Supermercado',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 2,
      space_id: 2,
      parent_id: 1,
      name: 'Alimentación',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 4,
      space_id: 2,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 0,
    },
    {
      id: 5,
      space_id: 8,
      parent_id: null,
      name: 'Otro espacio',
      default_type: 'expense',
      sort_order: 0,
    },
  ];

  it('ordena categorías y calcula la profundidad', (): void => {
    expect(transactionCategoryOptions(categories, 2, 'expense')).toEqual([
      {
        label: 'Supermercado',
        value: 1,
        depth: 0,
      },
      {
        label: 'Alimentación',
        value: 2,
        depth: 1,
      },
      {
        label: 'Fruta',
        value: 3,
        depth: 2,
      },
    ]);
  });

  it('filtra correctamente por tipo y espacio', (): void => {
    expect(transactionCategoryOptions(categories, 2, 'income')).toEqual([
      {
        label: 'Nómina',
        value: 4,
        depth: 0,
      },
    ]);
  });
});
