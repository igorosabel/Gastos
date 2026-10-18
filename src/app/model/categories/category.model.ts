export default interface Category {
  id: number;
  space_id: number;
  parent_id: number | null;
  name: string;
  default_type: 'income' | 'expense';
  sort_order: number;
}
