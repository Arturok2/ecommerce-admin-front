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
import type { PaginatedResult } from '@/components/products/types';
import type { Product } from '@/components/products/types';
import type { Customer } from './types';

interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface VariantOption {
  id: string;
  label: string; // "Tenis Nike Court - Blanco / 27 (SKU-001)"
}

interface ItemRow {
  key: string;
  variantId: string;
  cantidad: string;
}

interface AddressState {
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
}

const EMPTY_ADDRESS: AddressState = {
  calle: '',
  numero: '',
  colonia: '',
  ciudad: '',
  estado: '',
  codigoPostal: '',
};

function createEmptyItemRow(): ItemRow {
  return { key: crypto.randomUUID(), variantId: '', cantidad: '1' };
}

function buildVariantOptions(products: Product[]): VariantOption[] {
  const options: VariantOption[] = [];

  for (const product of products) {
    for (const variante of product.variantes) {
      const atributosLabel = variante.atributos.map((a) => a.valor).join(' / ');
      options.push({
        id: variante.id,
        label: `${product.nombre} - ${atributosLabel} (${variante.sku})`,
      });
    }
  }

  return options;
}

export function CreateOrderForm({ open, onOpenChange, onSuccess }: CreateOrderFormProps) {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [items, setItems] = useState<ItemRow[]>([createEmptyItemRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setClienteId('');
    setMetodoPago('');
    setAddress(EMPTY_ADDRESS);
    setItems([createEmptyItemRow()]);

    setIsLoadingOptions(true);
    Promise.all([
      apiClient.get<Customer[]>('/customers'),
      apiClient.get<PaginatedResult<Product>>('/products?limit=100'),
    ])
      .then(([customersRes, productsRes]) => {
        setCustomers(customersRes);
        setVariantOptions(buildVariantOptions(productsRes.data));
      })
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : 'No se pudieron cargar clientes/productos';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      })
      .finally(() => setIsLoadingOptions(false));
  }, [open, toast]);

  const updateItem = (key: string, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  };

  const addItemRow = () => setItems((prev) => [...prev, createEmptyItemRow()]);
  const removeItemRow = (key: string) => setItems((prev) => prev.filter((row) => row.key !== key));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasIncompleteItem = items.some((row) => !row.variantId || !row.cantidad);
    if (items.length === 0 || hasIncompleteItem) {
      toast({
        title: 'Revisa los productos',
        description: 'Cada línea necesita una variante y una cantidad.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/orders', {
        clienteId,
        metodoPago: metodoPago.trim(),
        direccion: { ...address },
        items: items.map((row) => ({
          variantId: row.variantId,
          cantidad: Number(row.cantidad),
        })),
      });

      toast({ title: 'Venta registrada correctamente' });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo registrar la venta';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar Venta Ficticia</DialogTitle>
          <DialogDescription>
            Simula una venta seleccionando un cliente, dirección y productos del inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clienteId">Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId} disabled={isLoadingOptions}>
                <SelectTrigger id="clienteId">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.nombre} — {customer.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodoPago">Método de pago</Label>
              <Input
                id="metodoPago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                placeholder="Tarjeta, transferencia..."
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Dirección de envío</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Calle"
                value={address.calle}
                onChange={(e) => setAddress((prev) => ({ ...prev, calle: e.target.value }))}
                required
                disabled={isSubmitting}
              />
              <Input
                placeholder="Número"
                value={address.numero}
                onChange={(e) => setAddress((prev) => ({ ...prev, numero: e.target.value }))}
                required
                disabled={isSubmitting}
              />
              <Input
                placeholder="Colonia"
                value={address.colonia}
                onChange={(e) => setAddress((prev) => ({ ...prev, colonia: e.target.value }))}
                required
                disabled={isSubmitting}
              />
              <Input
                placeholder="Ciudad"
                value={address.ciudad}
                onChange={(e) => setAddress((prev) => ({ ...prev, ciudad: e.target.value }))}
                required
                disabled={isSubmitting}
              />
              <Input
                placeholder="Estado"
                value={address.estado}
                onChange={(e) => setAddress((prev) => ({ ...prev, estado: e.target.value }))}
                required
                disabled={isSubmitting}
              />
              <Input
                placeholder="Código Postal"
                value={address.codigoPostal}
                onChange={(e) => setAddress((prev) => ({ ...prev, codigoPostal: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
                disabled={isSubmitting || isLoadingOptions}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar producto
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[1fr_100px_auto] items-end gap-2 rounded-md border border-slate-200 p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Producto / Variante</Label>
                    <Select
                      value={row.variantId}
                      onValueChange={(value) => updateItem(row.key, 'variantId', value)}
                      disabled={isSubmitting || isLoadingOptions}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una variante" />
                      </SelectTrigger>
                      <SelectContent>
                        {variantOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      value={row.cantidad}
                      onChange={(e) => updateItem(row.key, 'cantidad', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemRow(row.key)}
                    disabled={isSubmitting || items.length === 1}
                    title="Quitar producto"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
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
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? 'Guardando...' : 'Registrar Venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
