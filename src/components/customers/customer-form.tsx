'use client';

import { useState, type FormEvent } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Refresca la tabla en el padre
}

interface FormState {
  nombre: string;
  email: string;
  telefono: string;
}

const EMPTY_STATE: FormState = { nombre: '', email: '', telefono: '' };

// Tono sutil armónico para labels, consistente con el resto del sistema.
const FIELD_LABEL_CLASS = 'text-xs text-slate-600 dark:text-blue-300/70';

export function CustomerForm({ open, onOpenChange, onSuccess }: CustomerFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.post('/customers', {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      });

      toast({ title: 'Cliente creado correctamente' });
      setForm(EMPTY_STATE);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo crear el cliente';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Al cerrar el modal (cancelar o click fuera), limpia el formulario
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setForm(EMPTY_STATE);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Formulario corto: el body no necesita scroll en la práctica, pero
          mantiene el mismo patrón de 3 bloques que el resto de los modales
          por consistencia del sistema de diseño. */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-md flex-col overflow-hidden p-0 md:max-w-lg">
        <DialogHeader className="shrink-0 gap-1 border-b bg-background p-6">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-blue-200">
            Nuevo cliente
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-blue-300/70">
            Completa los datos para registrar un nuevo cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="nombre" className={FIELD_LABEL_CLASS}>
                Nombre Completo
              </Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={FIELD_LABEL_CLASS}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className={FIELD_LABEL_CLASS}>
                Teléfono
              </Label>
              <Input
                id="telefono"
                type="tel"
                value={form.telefono}
                onChange={(e) => updateField('telefono', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t bg-slate-50/50 p-6 dark:bg-zinc-900/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
