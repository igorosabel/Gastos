import categoriesToRows from '@model/categories/categories-to-rows.mapper';
import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';
import type TransactionCategoryOption from '@model/transactions/transaction-category-option.model';

export default function transactionCategoryOptions(
  categories: Category[],
  spaceId: number,
  type: 'income' | 'expense',
): TransactionCategoryOption[] {
  const rows: CategoryRow[] = categoriesToRows(
    categories.filter(
      (category: Category): boolean =>
        category.space_id === spaceId && category.default_type === type,
    ),
  );

  return rows.map(
    (row: CategoryRow): TransactionCategoryOption => ({
      label: row.category.name,
      value: row.category.id,
      depth: row.depth,
    }),
  );
}
