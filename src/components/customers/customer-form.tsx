'use client';

import { useState, type FormEvent } from 'react';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Completa los datos para registrar un nuevo cliente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              value={form.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
