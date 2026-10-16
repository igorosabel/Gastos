export default interface Space {
  id: number;
  name: string;
  type: 'personal' | 'shared';
  owner_id: number;
  is_owner: boolean;
}
