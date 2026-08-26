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

// Tono sutil armónico para labels/subtítulos, consistente con el resto del sistema.
const FIELD_LABEL_CLASS = 'text-xs text-slate-600 dark:text-blue-300/70';

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
      {/* p-0 + flex-col: header y footer fijos, el body con scroll propio
          evita que el formulario (dirección + N productos) desborde la pantalla. */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-md flex-col overflow-hidden p-0 md:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="shrink-0 gap-1 border-b bg-background p-6">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-blue-200">
            Generar Venta Ficticia
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-blue-300/70">
            Simula una venta seleccionando un cliente, dirección y productos del inventario.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clienteId" className={FIELD_LABEL_CLASS}>
                  Cliente
                </Label>
                {/* value guarda el id del cliente (lo que espera el backend);
                    SelectValue recibe el .nombre resuelto como children para
                    que el trigger nunca muestre el UUID crudo. */}
                <Select value={clienteId} onValueChange={setClienteId} disabled={isLoadingOptions}>
                  <SelectTrigger id="clienteId">
                    <SelectValue placeholder="Selecciona un cliente">
                      {customers.find((customer) => customer.id === clienteId)?.nombre}
                    </SelectValue>
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
                <Label htmlFor="metodoPago" className={FIELD_LABEL_CLASS}>
                  Método de pago
                </Label>
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
              <Label className="text-sm font-semibold text-slate-800 dark:text-blue-200/90">
                Dirección de envío
              </Label>
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
                <Label className="text-sm font-semibold text-slate-800 dark:text-blue-200/90">
                  Productos
                </Label>
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
                {items.map((row) => {
                  const selectedVariant = variantOptions.find((o) => o.id === row.variantId);
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[1fr_100px_auto] items-end gap-2 rounded-md border border-border bg-blue-50/60 p-3 dark:bg-blue-950/20"
                    >
                      <div className="space-y-1">
                        <Label className={FIELD_LABEL_CLASS}>Producto / Variante</Label>
                        {/* Mismo patrón: value = id de la variante, SelectValue
                            muestra el label legible resuelto localmente. */}
                        <Select
                          value={row.variantId}
                          onValueChange={(value) => updateItem(row.key, 'variantId', value)}
                          disabled={isSubmitting || isLoadingOptions}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una variante">
                              {selectedVariant?.label}
                            </SelectValue>
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
                        <Label className={FIELD_LABEL_CLASS}>Cantidad</Label>
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
                  );
                })}
              </div>
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
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? 'Guardando...' : 'Registrar Venta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
