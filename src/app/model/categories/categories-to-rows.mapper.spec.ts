import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type Category from '@model/categories/category.model';
import { describe, expect, it } from 'vitest';

describe('categoriesToRows', (): void => {
  const categories: Category[] = [
    {
      id: 3,
      space_id: 1,
      parent_id: 2,
      name: 'Electricidad',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 2,
      space_id: 1,
      parent_id: 1,
      name: 'Suministros',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 4,
      space_id: 1,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 0,
    },
    {
      id: 1,
      space_id: 1,
      parent_id: null,
      name: 'Hogar',
      default_type: 'expense',
      sort_order: 1,
    },
  ];

  it('devuelve un listado vacío sin categorías', (): void => {
    expect(categoriesToRows([])).toEqual([]);
  });

  it('ordena y construye la jerarquía', (): void => {
    const rows = categoriesToRows(categories);

    expect(rows.map((row) => row.category.name)).toEqual([
      'Nómina',
      'Hogar',
      'Suministros',
      'Electricidad',
    ]);

    expect(rows.map((row) => row.depth)).toEqual([0, 0, 1, 2]);
    expect(rows[2]?.parentName).toBe('Hogar');
    expect(rows[3]?.parentName).toBe('Suministros');
  });

  it('presenta una categoría sin padre conocido como raíz', (): void => {
    const orphan: Category = {
      id: 10,
      space_id: 1,
      parent_id: 999,
      name: 'Otros',
      default_type: 'expense',
      sort_order: 0,
    };

    const rows = categoriesToRows([orphan]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.depth).toBe(0);
    expect(rows[0]?.parentName).toBeNull();
  });

  it('evita ciclos entre categorías', (): void => {
    const cyclic: Category[] = [
      {
        id: 10,
        space_id: 1,
        parent_id: 11,
        name: 'Primera',
        default_type: 'expense',
        sort_order: 0,
      },
      {
        id: 11,
        space_id: 1,
        parent_id: 10,
        name: 'Segunda',
        default_type: 'expense',
        sort_order: 0,
      },
    ];

    const rows = categoriesToRows(cyclic);

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.category.id)).size).toBe(2);
  });
});
