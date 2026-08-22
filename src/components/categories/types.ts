export interface Category {
  id: string;
  nombre: string;
  posicion: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Forma en la que responde GET /categories: solo raíces con 2do nivel en `children`
export interface CategoryTreeNode extends Category {
  children: Category[];
}

/**
 * Aplana el árbol (raíces + children de 2do nivel) en una lista única.
 * Útil tanto para la tabla como para el <select> de categoría padre.
 */
export function flattenCategories(tree: CategoryTreeNode[]): Category[] {
  const flat: Category[] = [];

  for (const root of tree) {
    const { children, ...rootData } = root;
    flat.push(rootData);
    flat.push(...children);
  }

  return flat;
}
