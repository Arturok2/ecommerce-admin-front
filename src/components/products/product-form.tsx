'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
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
import { apiClient, ApiError, uploadImage } from '@/lib/api-client';
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

interface BaseFormErrors {
  nombre?: string;
  descripcion?: string;
  marca?: string;
  genero?: string;
  categoriaId?: string;
}

interface VariantRowErrors {
  sku?: string;
  precio?: string;
  stock?: string;
  color?: string;
  talla?: string;
}

// Mismos límites que valida el backend (uploads.controller.ts) — se
// replican aquí para dar el error al instante, sin esperar la subida.
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateBaseForm(form: BaseFormState): BaseFormErrors {
  const errors: BaseFormErrors = {};

  if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
  if (!form.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
  if (!form.marca.trim()) errors.marca = 'La marca es obligatoria';
  if (!form.genero) errors.genero = 'Selecciona un género';
  if (!form.categoriaId) errors.categoriaId = 'Selecciona una categoría';

  return errors;
}

// Solo dígitos, con hasta 2 decimales opcionales — sin letras, sin signo
// negativo. Number(str) > 0 al final descarta "0" y "0.00".
const POSITIVE_DECIMAL_REGEX = /^\d+(\.\d{1,2})?$/;
// Solo dígitos enteros — sin letras, sin signo negativo, sin decimales.
const POSITIVE_INTEGER_REGEX = /^\d+$/;

function validateVariantRow(variant: VariantRow, isEditMode: boolean): VariantRowErrors {
  const errors: VariantRowErrors = {};

  if (!isEditMode && !variant.sku.trim()) {
    errors.sku = 'El SKU es obligatorio';
  }

  const precio = variant.precio.trim();
  if (!precio) {
    errors.precio = 'El precio es obligatorio';
  } else if (!POSITIVE_DECIMAL_REGEX.test(precio) || Number(precio) <= 0) {
    errors.precio = 'Solo números positivos, sin letras';
  }

  // Nota: se interpreta "positivo" de forma literal (> 0). Si en la práctica
  // 0 debe ser un valor válido para "sin existencias", solo hay que cambiar
  // Number(stock) <= 0 por Number(stock) < 0 aquí abajo.
  const stock = variant.stock.trim();
  if (!stock) {
    errors.stock = 'El stock es obligatorio';
  } else if (!POSITIVE_INTEGER_REGEX.test(stock) || Number(stock) <= 0) {
    errors.stock = 'Solo números positivos, sin letras';
  }

  if (!variant.color.trim()) errors.color = 'El color es obligatorio';
  if (!variant.talla.trim()) errors.talla = 'La talla es obligatoria';

  return errors;
}

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
  const [baseErrors, setBaseErrors] = useState<BaseFormErrors>({});
  const [variantErrors, setVariantErrors] = useState<Record<string, VariantRowErrors>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const isEditMode = initialData !== null;

  useEffect(() => {
    if (!open) return;
    setBaseErrors({});
    setVariantErrors({});
    setImageError(null);

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
    if (baseErrors[field as keyof BaseFormErrors]) {
      setBaseErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const updateVariantField = (key: string, field: keyof VariantRow, value: string) => {
    setVariants((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    if (variantErrors[key]?.[field as keyof VariantRowErrors]) {
      setVariantErrors((prev) => ({ ...prev, [key]: { ...prev[key], [field]: undefined } }));
    }
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, createEmptyVariantRow()]);
  };

  const removeVariantRow = (key: string) => {
    setVariants((prev) => prev.filter((row) => row.key !== key));
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo más adelante (si no se limpia
    // el input, el navegador no vuelve a disparar onChange con el mismo file).
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Formato no soportado. Usa JPG, PNG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('La imagen no puede pesar más de 5 MB.');
      return;
    }

    setImageError(null);
    setIsUploadingImage(true);

    try {
      const result = await uploadImage(file);
      updateField('imagenUrl', result.url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo subir la imagen';
      setImageError(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    updateField('imagenUrl', '');
    setImageError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const baseFormErrors = validateBaseForm(form);

    const rowErrorsMap: Record<string, VariantRowErrors> = {};
    for (const variant of variants) {
      const rowErrors = validateVariantRow(variant, isEditMode);
      if (Object.keys(rowErrors).length > 0) rowErrorsMap[variant.key] = rowErrors;
    }

    // En creación siempre se exige al menos una variante; en edición un
    // producto puede legítimamente no tener ninguna todavía.
    const needsAtLeastOneVariant = !isEditMode && variants.length === 0;

    const hasErrors =
      Object.keys(baseFormErrors).length > 0 ||
      Object.keys(rowErrorsMap).length > 0 ||
      needsAtLeastOneVariant;

    if (hasErrors) {
      setBaseErrors(baseFormErrors);
      setVariantErrors(rowErrorsMap);
      toast({
        title: 'Revisa el formulario',
        description: needsAtLeastOneVariant
          ? 'Agrega al menos una variante con todos sus datos.'
          : 'Hay campos obligatorios pendientes o inválidos.',
        variant: 'destructive',
      });
      return;
    }

    setBaseErrors({});
    setVariantErrors({});
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
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
                  aria-invalid={Boolean(baseErrors.nombre)}
                  disabled={isSubmitting}
                />
                {baseErrors.nombre && (
                  <p className="text-xs font-medium text-red-500">{baseErrors.nombre}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className={FIELD_LABEL_CLASS}>
                  Descripción
                </Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => updateField('descripcion', e.target.value)}
                  aria-invalid={Boolean(baseErrors.descripcion)}
                  disabled={isSubmitting}
                  rows={3}
                />
                {baseErrors.descripcion && (
                  <p className="text-xs font-medium text-red-500">{baseErrors.descripcion}</p>
                )}
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
                    aria-invalid={Boolean(baseErrors.marca)}
                    disabled={isSubmitting}
                  />
                  {baseErrors.marca && (
                    <p className="text-xs font-medium text-red-500">{baseErrors.marca}</p>
                  )}
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
                    <SelectTrigger
                      id="genero"
                      className={baseErrors.genero ? 'border-red-500 ring-3 ring-red-500/20' : undefined}
                    >
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
                  {baseErrors.genero && (
                    <p className="text-xs font-medium text-red-500">{baseErrors.genero}</p>
                  )}
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
                    <SelectTrigger
                      id="categoriaId"
                      className={baseErrors.categoriaId ? 'border-red-500 ring-3 ring-red-500/20' : undefined}
                    >
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
                  {baseErrors.categoriaId && (
                    <p className="text-xs font-medium text-red-500">{baseErrors.categoriaId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className={FIELD_LABEL_CLASS}>Imagen del producto (opcional)</Label>

                  {form.imagenUrl ? (
                    // Ya hay una imagen (subida ahora o cargada de la edición):
                    // vista previa + opción de quitarla para subir otra.
                    <div className="flex items-center gap-3 rounded-md border border-border p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.imagenUrl}
                        alt="Vista previa del producto"
                        className="h-14 w-14 rounded-md object-cover"
                      />
                      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {form.imagenUrl}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveImage}
                        disabled={isSubmitting || isUploadingImage}
                        title="Quitar imagen"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs transition-colors ${
                        imageError
                          ? 'border-red-500 text-red-500'
                          : 'border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
                      }`}
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          Haz clic para elegir una imagen
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageFileChange}
                        disabled={isSubmitting || isUploadingImage}
                      />
                    </label>
                  )}
                  {imageError && <p className="text-xs font-medium text-red-500">{imageError}</p>}
                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF — máx. 5 MB.</p>
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
                  {variants.map((variant, index) => {
                    const rowErrors = variantErrors[variant.key];
                    return (
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
                        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6 lg:items-start">
                          <div className="space-y-1">
                            <Label className={FIELD_LABEL_CLASS}>SKU</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) => updateVariantField(variant.key, 'sku', e.target.value)}
                              aria-invalid={Boolean(rowErrors?.sku)}
                              disabled={isSubmitting || isEditMode}
                              title={isEditMode ? 'El SKU no se puede editar' : undefined}
                              className={isEditMode ? 'text-muted-foreground' : undefined}
                            />
                            {rowErrors?.sku && (
                              <p className="text-xs font-medium text-red-500">{rowErrors.sku}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className={FIELD_LABEL_CLASS}>Precio</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={variant.precio}
                              onChange={(e) => updateVariantField(variant.key, 'precio', e.target.value)}
                              aria-invalid={Boolean(rowErrors?.precio)}
                              disabled={isSubmitting}
                            />
                            {rowErrors?.precio && (
                              <p className="text-xs font-medium text-red-500">{rowErrors.precio}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className={FIELD_LABEL_CLASS}>Stock</Label>
                            <Input
                              type="number"
                              min={0}
                              value={variant.stock}
                              onChange={(e) => updateVariantField(variant.key, 'stock', e.target.value)}
                              aria-invalid={Boolean(rowErrors?.stock)}
                              disabled={isSubmitting}
                            />
                            {rowErrors?.stock && (
                              <p className="text-xs font-medium text-red-500">{rowErrors.stock}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className={FIELD_LABEL_CLASS}>Color</Label>
                            <Input
                              value={variant.color}
                              onChange={(e) => updateVariantField(variant.key, 'color', e.target.value)}
                              placeholder="Blanco"
                              aria-invalid={Boolean(rowErrors?.color)}
                              disabled={isSubmitting}
                            />
                            {rowErrors?.color && (
                              <p className="text-xs font-medium text-red-500">{rowErrors.color}</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className={FIELD_LABEL_CLASS}>Talla</Label>
                            <Input
                              value={variant.talla}
                              onChange={(e) => updateVariantField(variant.key, 'talla', e.target.value)}
                              placeholder="27"
                              aria-invalid={Boolean(rowErrors?.talla)}
                              disabled={isSubmitting}
                            />
                            {rowErrors?.talla && (
                              <p className="text-xs font-medium text-red-500">{rowErrors.talla}</p>
                            )}
                          </div>

                          {!isEditMode && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeVariantRow(variant.key)}
                              disabled={isSubmitting || variants.length === 1}
                              title="Quitar variante"
                              className="self-end justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Quitar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
            <Button type="submit" disabled={isSubmitting || isUploadingImage}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
