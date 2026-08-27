'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  id?: string; // Presente solo en modo edición: id real de la variante en la BD
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

// Clase compartida para labels de campo: tono sutil armónico con la
// paleta púrpura pastel, en vez del gris plano heredado (text-slate-500).
const FIELD_LABEL_CLASS = 'text-xs text-slate-600 dark:text-blue-300/70';

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
      // En edición sí se cargan las variantes existentes, para poder
      // ajustar precio/color/talla. El SKU y el alta/baja de variantes
      // siguen gestionándose aparte (ver nota en el JSX).
      setVariants(
        initialData.variantes.map((v) => ({
          key: v.id,
          id: v.id,
          sku: v.sku,
          precio: v.precio,
          stock: String(v.stock),
          color: v.atributos.find((a) => a.tipo.toLowerCase() === 'color')?.valor ?? '',
          talla: v.atributos.find((a) => a.tipo.toLowerCase() === 'talla')?.valor ?? '',
        })),
      );
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

    const hasIncompleteRow = variants.some(
      (v) =>
        !v.precio ||
        v.stock.trim() === '' ||
        !v.color.trim() ||
        !v.talla.trim() ||
        (!isEditMode && !v.sku.trim()),
    );

    // En creación siempre se exige al menos una variante; en edición un
    // producto puede legítimamente no tener ninguna todavía, así que un
    // arreglo vacío no debe bloquear el guardado de los datos base.
    const variantsAreInvalid = isEditMode
      ? hasIncompleteRow
      : variants.length === 0 || hasIncompleteRow;

    if (variantsAreInvalid) {
      toast({
        title: 'Revisa las variantes',
        description: isEditMode
          ? 'Cada variante necesita precio, stock, color y talla.'
          : 'Cada variante necesita SKU, precio, stock, color y talla.',
        variant: 'destructive',
      });
      return;
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
        // Datos base del producto
        await apiClient.patch(`/products/${initialData.id}`, basePayload);

        // Cada variante existente se actualiza por separado (precio, stock,
        // color, talla). El SKU y el alta/baja de variantes no se tocan aquí.
        await Promise.all(
          variants
            .filter((v) => v.id)
            .map((v) =>
              apiClient.patch(`/products/${initialData.id}/variants/${v.id}`, {
                precio: Number(v.precio),
                stock: Number(v.stock),
                color: v.color.trim(),
                talla: v.talla.trim(),
              }),
            ),
        );

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
      {/* p-0 + flex-col: el padding se delega a header/body/footer para
          poder darle scroll exclusivo solo al body sin que el modal
          desborde la pantalla en formularios largos (variantes, historial, etc). */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-md flex-col overflow-hidden p-0 md:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="shrink-0 gap-1 border-b bg-background p-6">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-blue-200">
            {isEditMode ? 'Editar producto' : 'Nuevo producto'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-blue-300/70">
            {isEditMode
              ? 'Modifica los datos generales del producto.'
              : 'Completa los datos del producto y sus variantes de venta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Modal Body: único bloque con scroll — header y footer quedan fijos */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Datos del producto base */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className={FIELD_LABEL_CLASS}>
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className={FIELD_LABEL_CLASS}>
                  Descripción
                </Label>
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
                  <Label htmlFor="marca" className={FIELD_LABEL_CLASS}>
                    Marca
                  </Label>
                  <Input
                    id="marca"
                    value={form.marca}
                    onChange={(e) => updateField('marca', e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genero" className={FIELD_LABEL_CLASS}>
                    Género
                  </Label>
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
                  <Label htmlFor="categoriaId" className={FIELD_LABEL_CLASS}>
                    Categoría
                  </Label>
                  {/* El <Select> guarda el UUID de la categoría en form.categoriaId
                      (lo que necesita el backend), pero <SelectValue> recibe como
                      children el .nombre resuelto — así el trigger siempre muestra
                      texto legible y nunca el id crudo. Ver src/components/ui/select.tsx. */}
                  <Select
                    value={form.categoriaId}
                    onValueChange={(value) => updateField('categoriaId', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="categoriaId">
                      <SelectValue placeholder="Selecciona una categoría">
                        {categories.find((category) => category.id === form.categoriaId)?.nombre}
                      </SelectValue>
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
                  <Label htmlFor="imagenUrl" className={FIELD_LABEL_CLASS}>
                    Imagen (URL, opcional)
                  </Label>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-800 dark:text-blue-200/90">
                  Variantes del Producto (Tallas y Colores)
                </Label>
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariantRow}
                    disabled={isSubmitting}
                    // Botón "secundario": se distingue de Cancelar (outline neutro)
                    // y de Guardar (acción principal) con un tinte azul propio.
                    className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Agregar Variante
                  </Button>
                )}
              </div>

              {isEditMode && (
                <p className="rounded-md bg-blue-50/50 p-3 text-sm text-slate-600 dark:bg-zinc-900/80 dark:text-blue-300/70">
                  Puedes editar el precio, color y talla de cada variante. El SKU y el alta/baja de
                  variantes se gestionan por separado.
                </p>
              )}

              {isEditMode && variants.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-slate-500 dark:text-blue-300/60">
                  Este producto no tiene variantes registradas.
                </p>
              ) : (
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div
                      key={variant.key}
                      // Cada variante es su propia tarjeta con acento azul
                      // (borde izquierdo + fondo muy tenue) para que se
                      // distinga claramente de la siguiente.
                      className="space-y-3 rounded-lg border border-blue-200/70 border-l-4 border-l-blue-400 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:border-l-blue-500 dark:bg-blue-950/10"
                    >
                      <p className="text-xs font-medium text-blue-700/70 dark:text-blue-300/60">
                        Variante #{index + 1}
                      </p>

                      {/* Mobile: 3 columnas → se acomoda en 2 filas (SKU/Precio/Stock,
                          Color/Talla/Quitar). Desktop (lg+): 6 columnas, todo en una
                          sola línea. */}
                      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 lg:items-end">
                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>SKU</Label>
                          <Input
                            value={variant.sku}
                            onChange={(e) => updateVariantField(variant.key, 'sku', e.target.value)}
                            disabled={isSubmitting || isEditMode}
                            title={isEditMode ? 'El SKU no se puede editar' : undefined}
                            className={isEditMode ? 'text-muted-foreground' : undefined}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>Precio</Label>
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
                          <Label className={FIELD_LABEL_CLASS}>Stock</Label>
                          <Input
                            type="number"
                            min={0}
                            value={variant.stock}
                            onChange={(e) => updateVariantField(variant.key, 'stock', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>Color</Label>
                          <Input
                            value={variant.color}
                            onChange={(e) => updateVariantField(variant.key, 'color', e.target.value)}
                            placeholder="Blanco"
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>Talla</Label>
                          <Input
                            value={variant.talla}
                            onChange={(e) => updateVariantField(variant.key, 'talla', e.target.value)}
                            placeholder="27"
                            disabled={isSubmitting}
                          />
                        </div>

                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeVariantRow(variant.key)}
                            disabled={isSubmitting || variants.length === 1}
                            title="Quitar variante"
                            className="justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                            Quitar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer: fijo, fuera del área con scroll */}
          <div className="flex shrink-0 justify-end gap-2 border-t bg-slate-50/50 p-6 dark:bg-zinc-900/30">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
