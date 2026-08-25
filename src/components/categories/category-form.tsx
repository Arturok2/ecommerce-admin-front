'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Category } from './types';

const NO_PARENT_VALUE = 'none';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[]; // Lista completa (aplanada), para el select de categoría padre
  initialData: Category | null; // null = modo crear, Category = modo editar
  onSuccess: () => void; // Refresca la tabla en el padre
}

interface FormState {
  nombre: string;
  posicion: string;
  parentId: string;
}

const EMPTY_STATE: FormState = { nombre: '', posicion: '0', parentId: NO_PARENT_VALUE };

// Tono sutil armónico para labels, consistente con el resto del sistema.
const FIELD_LABEL_CLASS = 'text-xs text-slate-600 dark:text-blue-300/70';

export function CategoryForm({
  open,
  onOpenChange,
  categories,
  initialData,
  onSuccess,
}: CategoryFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = initialData !== null;

  // Sincroniza el formulario cada vez que se abre (crear vacío / editar con datos)
  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setForm({
        nombre: initialData.nombre,
        posicion: String(initialData.posicion),
        parentId: initialData.parentId ?? NO_PARENT_VALUE,
      });
    } else {
      setForm(EMPTY_STATE);
    }
  }, [open, initialData]);

  // En modo edición, una categoría no puede ser su propia padre (evita bucles)
  const parentOptions = categories.filter((c) => c.id !== initialData?.id);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      nombre: form.nombre.trim(),
      posicion: Number(form.posicion),
      parentId: form.parentId === NO_PARENT_VALUE ? undefined : form.parentId,
    };

    try {
      if (isEditMode && initialData) {
        await apiClient.patch(`/categories/${initialData.id}`, payload);
        toast({ title: 'Categoría actualizada correctamente' });
      } else {
        await apiClient.post('/categories', payload);
        toast({ title: 'Categoría creada correctamente' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo guardar la categoría';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Formulario corto: mismo patrón de 3 bloques que el resto de los
          modales por consistencia, aunque en la práctica el body no llegue
          a necesitar scroll. */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-md flex-col overflow-hidden p-0 md:max-w-lg">
        <DialogHeader className="shrink-0 gap-1 border-b bg-background p-6">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-blue-200">
            {isEditMode ? 'Editar categoría' : 'Nueva categoría'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-blue-300/70">
            {isEditMode
              ? 'Modifica los datos de la categoría seleccionada.'
              : 'Completa los datos para crear una nueva categoría.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="nombre" className={FIELD_LABEL_CLASS}>
                Nombre
              </Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="posicion" className={FIELD_LABEL_CLASS}>
                Posición
              </Label>
              <Input
                id="posicion"
                type="number"
                min={0}
                value={form.posicion}
                onChange={(e) => setForm((prev) => ({ ...prev, posicion: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId" className={FIELD_LABEL_CLASS}>
                Categoría padre (opcional)
              </Label>
              {/* Ya resuelto correctamente en el original: value guarda el id,
                  SelectValue muestra el .nombre (o el texto fijo "Sin
                  categoría padre") en vez del UUID crudo. */}
              <Select
                value={form.parentId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger id="parentId">
                  <SelectValue placeholder="Sin categoría padre">
                    {form.parentId === NO_PARENT_VALUE
                      ? 'Sin categoría padre'
                      : parentOptions.find((category) => category.id === form.parentId)?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT_VALUE}>Sin categoría padre</SelectItem>
                  {parentOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
