export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface CategoryType {
  id: string;
  name: string;
  categories: Category[];
  defaultCategoryId: string | null;
  showInNodeView: boolean;
}
