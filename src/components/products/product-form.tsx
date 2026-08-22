'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Category } from '@/components/categories/types';
import { GENERO_OPTIONS, type Genero, type Product } from './types';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initialData: Product | null; // null = crear, Product = editar
  onSuccess: () => void;
}

interface BaseFormState {
  nombre: string;
  descripcion: string;
  marca: string;
  genero: Genero | '';
  categoriaId: string;
  imagenUrl: string;
}

// Fila de variante en el formulario: Color y Talla como campos dedicados,
// que al enviar se mapean al formato de atributos que espera el backend.
interface VariantRow {
  key: string;
  sku: string;
  precio: string;
  stock: string;
  color: string;
  talla: string;
}

const EMPTY_BASE_STATE: BaseFormState = {
  nombre: '',
  descripcion: '',
  marca: '',
  genero: '',
  categoriaId: '',
  imagenUrl: '',
};

function createEmptyVariantRow(): VariantRow {
  return { key: crypto.randomUUID(), sku: '', precio: '', stock: '', color: '', talla: '' };
}

export function ProductForm({
  open,
  onOpenChange,
  categories,
  initialData,
  onSuccess,
}: ProductFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<BaseFormState>(EMPTY_BASE_STATE);
  const [variants, setVariants] = useState<VariantRow[]>([createEmptyVariantRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = initialData !== null;

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setForm({
        nombre: initialData.nombre,
        descripcion: initialData.descripcion,
        marca: initialData.marca,
        genero: initialData.genero,
        categoriaId: initialData.categoriaId,
        imagenUrl: initialData.imagenes[0] ?? '',
      });
      // En edición no se tocan variantes (el backend no las acepta en el PATCH del producto base)
      setVariants([]);
    } else {
      setForm(EMPTY_BASE_STATE);
      setVariants([createEmptyVariantRow()]);
    }
  }, [open, initialData]);

  const updateField = <K extends keyof BaseFormState>(field: K, value: BaseFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateVariantField = (key: string, field: keyof VariantRow, value: string) => {
    setVariants((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, createEmptyVariantRow()]);
  };

  const removeVariantRow = (key: string) => {
    setVariants((prev) => prev.filter((row) => row.key !== key));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditMode) {
      const hasIncompleteRow = variants.some(
        (v) => !v.sku.trim() || !v.precio || !v.stock || !v.color.trim() || !v.talla.trim(),
      );

      if (variants.length === 0 || hasIncompleteRow) {
        toast({
          title: 'Revisa las variantes',
          description: 'Cada variante necesita SKU, precio, stock, color y talla.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    const basePayload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      marca: form.marca.trim(),
      genero: form.genero as Genero,
      categoriaId: form.categoriaId,
      imagenes: form.imagenUrl.trim() ? [form.imagenUrl.trim()] : [],
    };

    try {
      if (isEditMode && initialData) {
        // Edición básica: solo datos del producto base (el backend no acepta variantes en el PATCH)
        await apiClient.patch(`/products/${initialData.id}`, basePayload);
        toast({ title: 'Producto actualizado correctamente' });
      } else {
        await apiClient.post('/products', {
          ...basePayload,
          variants: variants.map((v) => ({
            sku: v.sku.trim(),
            precio: Number(v.precio),
            stock: Number(v.stock),
            atributos: [
              { nombre: 'Color', valor: v.color.trim() },
              { nombre: 'Talla', valor: v.talla.trim() },
            ],
          })),
        });
        toast({ title: 'Producto creado correctamente' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo guardar el producto';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica los datos generales del producto.'
              : 'Completa los datos del producto y sus variantes de venta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del producto base */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => updateField('descripcion', e.target.value)}
                required
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={form.marca}
                  onChange={(e) => updateField('marca', e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero">Género</Label>
                <Select
                  value={form.genero}
                  onValueChange={(value) => updateField('genero', value as Genero)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="genero">
                    <SelectValue placeholder="Selecciona un género" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERO_OPTIONS.map((genero) => (
                      <SelectItem key={genero} value={genero}>
                        {genero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoriaId">Categoría</Label>
                <Select
                  value={form.categoriaId}
                  onValueChange={(value) => updateField('categoriaId', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="categoriaId">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagenUrl">Imagen (URL, opcional)</Label>
                <Input
                  id="imagenUrl"
                  value={form.imagenUrl}
                  onChange={(e) => updateField('imagenUrl', e.target.value)}
                  placeholder="https://..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Sub-formulario dinámico de variantes — solo en modo creación */}
          {isEditMode ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">
              Las variantes (color, talla, stock, precio) se administran por separado y no se
              modifican desde este formulario de edición.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Variantes del Producto (Tallas y Colores)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariantRow}
                  disabled={isSubmitting}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar Variante
                </Button>
              </div>

              <div className="space-y-3">
                {variants.map((variant) => (
                  <div
                    key={variant.key}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-slate-200 p-3"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariantField(variant.key, 'sku', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Precio</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={variant.precio}
                        onChange={(e) => updateVariantField(variant.key, 'precio', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Stock</Label>
                      <Input
                        type="number"
                        min={0}
                        value={variant.stock}
                        onChange={(e) => updateVariantField(variant.key, 'stock', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Color</Label>
                      <Input
                        value={variant.color}
                        onChange={(e) => updateVariantField(variant.key, 'color', e.target.value)}
                        placeholder="Blanco"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Talla</Label>
                      <Input
                        value={variant.talla}
                        onChange={(e) => updateVariantField(variant.key, 'talla', e.target.value)}
                        placeholder="27"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVariantRow(variant.key)}
                      disabled={isSubmitting || variants.length === 1}
                      title="Quitar variante"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
