'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { ProductForm } from '@/components/products/product-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import { flattenCategories, type Category, type CategoryTreeNode } from '@/components/categories/types';
import type { PaginatedResult, Product } from '@/components/products/types';

export default function ProductsPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Imagen mostrada en el modal de "vista ampliada" (null = cerrado)
  const [previewImage, setPreviewImage] = useState<{ url: string; nombre: string } | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<PaginatedResult<Product>>('/products?limit=50');
      setProducts(res.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar los productos';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchCategories = useCallback(async () => {
    try {
      const tree = await apiClient.get<CategoryTreeNode[]>('/categories');
      setCategories(flattenCategories(tree));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar las categorías';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleCreateClick = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (product: Product) => {
    const confirmed = window.confirm(`¿Eliminar el producto "${product.nombre}"?`);
    if (!confirmed) return;

    try {
      await apiClient.delete(`/products/${product.id}`);
      toast({ title: 'Producto eliminado correctamente' });
      fetchProducts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo eliminar el producto';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'imagen',
        header: 'Imagen',
        cell: ({ row }) => {
          const url = row.original.imagenes[0];
          return url ? (
            <button
              type="button"
              onClick={() => setPreviewImage({ url, nombre: row.original.nombre })}
              className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              title="Ver imagen ampliada"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={row.original.nombre}
                className="h-10 w-10 cursor-zoom-in rounded-md border border-border object-cover"
              />
            </button>
          ) : (
            <div className="h-10 w-10 rounded-md border border-dashed border-border bg-muted" />
          );
        },
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre del Producto',
        cell: ({ row }) => (
          <div>
            <p>{row.original.nombre}</p>
            {row.original.descripcion && (
              // line-clamp-1 recorta a una sola línea con "…" — la descripción
              // completa queda disponible en el título nativo (tooltip) al pasar el mouse.
              <p
                className="line-clamp-1 max-w-[220px] text-xs text-muted-foreground"
                title={row.original.descripcion}
              >
                {row.original.descripcion}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'marca',
        header: 'Marca',
      },
      {
        id: 'categoria',
        header: 'Categoría Asociada',
        cell: ({ row }) => row.original.categoria?.nombre ?? '—',
      },
      {
        accessorKey: 'genero',
        header: 'Género',
        cell: ({ row }) => <Badge variant="outline">{row.original.genero}</Badge>,
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
          const isActive = row.original.estado === 'ACTIVO';
          return (
            <Badge
              variant="outline"
              className={
                isActive
                  ? 'border-green-200 bg-green-100 text-green-700 hover:bg-green-100'
                  : 'border-red-200 bg-red-100 text-red-700 hover:bg-red-100'
              }
            >
              {row.original.estado}
            </Badge>
          );
        },
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => {
          const product = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
              >
                  <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditClick(product)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(product)}
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
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-200">Productos</h1>
          <p className="mt-1 text-sm text-blue-600/70 dark:text-blue-300/40">
            Administra el catálogo de productos y sus variantes de venta.
          </p>
        </div>

        <Button onClick={handleCreateClick}>+ Nuevo Producto</Button>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Buscar producto..."
        emptyMessage="No se encontraron productos"
      />

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={categories}
        initialData={editingProduct}
        onSuccess={fetchProducts}
      />

      {/* Vista ampliada de la imagen del producto — modal chico, solo para
          ver mejor la miniatura, no un visor de imagen completo. */}
      <Dialog open={previewImage !== null} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-sm p-4">
          <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-blue-200">
            {previewImage?.nombre}
          </DialogTitle>
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage.url}
              alt={previewImage.nombre}
              className="max-h-[60vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
