'use client';

import { useEffect, useState, type FormEvent } from 'react';
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
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto md:max-w-3xl lg:max-w-[45vw]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{isEditMode ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica los datos de la categoría seleccionada.'
              : 'Completa los datos para crear una nueva categoría.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="posicion">Posición</Label>
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
            <Label htmlFor="parentId">Categoría padre (opcional)</Label>
            <Select
              value={form.parentId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
              disabled={isSubmitting}
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder="Sin categoría padre" />
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
