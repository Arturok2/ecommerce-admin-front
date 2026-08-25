'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { CategoryForm } from '@/components/categories/category-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import { flattenCategories, type Category, type CategoryTreeNode } from '@/components/categories/types';

export default function CategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const parentNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.nombre])),
    [categories],
  );

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const tree = await apiClient.get<CategoryTreeNode[]>('/categories');
      setCategories(flattenCategories(tree));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar las categorías';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateClick = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (category: Category) => {
    const confirmed = window.confirm(`¿Eliminar la categoría "${category.nombre}"?`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/categories/${category.id}`);
      toast({ title: 'Categoría eliminada correctamente' });
      fetchCategories();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo eliminar la categoría';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'nombre',
        header: 'Nombre',
        cell: ({ row }) => {
          const category = row.original;
          const parentName = category.parentId ? parentNameById.get(category.parentId) : null;

          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{category.nombre}</span>
              {parentName && (
                <Badge variant="secondary" className="font-normal">
                  Hija de: {parentName}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'posicion',
        header: 'Posición',
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => {
          const category = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
              >
                  <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditClick(category)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(category)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentNameById],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-200">Categorías</h1>
          <p className="mt-1 text-sm text-blue-600/70 dark:text-blue-300/40">
            Organiza el catálogo en categorías y subcategorías.
          </p>
        </div>

        <Button onClick={handleCreateClick}>+ Nueva Categoría</Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        searchPlaceholder="Buscar categoría..."
        emptyMessage="No se encontraron categorías"
      />

      <CategoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        initialData={editingCategory}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
