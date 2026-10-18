import type CategoryRow from '@model/categories/category-row.model';
import type Category from '@model/categories/category.model';

export default function categoriesToRows(categories: Category[]): CategoryRow[] {
  const rows: CategoryRow[] = [];
  const byId: Map<number, Category> = new Map<number, Category>(
    categories.map((category: Category): [number, Category] => [category.id, category]),
  );
  const children: Map<number | null, Category[]> = new Map<number | null, Category[]>();
  const visited: Set<number> = new Set<number>();

  for (const category of categories) {
    const parentId: number | null =
      category.parent_id !== null && byId.has(category.parent_id) ? category.parent_id : null;

    const siblings: Category[] = children.get(parentId) ?? [];
    siblings.push(category);
    children.set(parentId, siblings);
  }

  for (const siblings of children.values()) {
    siblings.sort(
      (a: Category, b: Category): number =>
        a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'es') || a.id - b.id,
    );
  }

  function visit(category: Category, depth: number, parentName: string | null): void {
    if (visited.has(category.id)) {
      return;
    }

    visited.add(category.id);

    rows.push({
      category,
      depth,
      parentName,
    });

    for (const child of children.get(category.id) ?? []) {
      visit(child, depth + 1, category.name);
    }
  }

  for (const category of children.get(null) ?? []) {
    visit(category, 0, null);
  }

  // Recupera categorías huérfanas o afectadas por ciclos
  // sin introducir recursión infinita.
  for (const category of categories) {
    if (!visited.has(category.id)) {
      visit(category, 0, null);
    }
  }

  return rows;
}
