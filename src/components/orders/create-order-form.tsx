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
import type { Customer, MexicanState, PaymentMethod } from './types';

interface CreateOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface VariantOption {
  id: string;
  label: string; // "Tenis Nike Court - Blanco / 27 (SKU-001)"
  stock: number;
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
// Estilo de error para los <SelectTrigger> — el Select propio no trae
// soporte nativo para aria-invalid como el <Input>, así que se aplica a mano.
const SELECT_ERROR_CLASS = 'border-red-500 ring-3 ring-red-500/20';

interface AddressErrors {
  calle?: string;
  numero?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
}

interface ItemErrors {
  variantId?: string;
  cantidad?: string;
}

interface FormErrors {
  clienteId?: string;
  metodoPago?: string;
  address?: AddressErrors;
  items?: Record<string, ItemErrors>; // keyed por row.key
}

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
        stock: variante.stock,
      });
    }
  }

  return options;
}

function validateOrderForm(
  clienteId: string,
  metodoPago: string,
  address: AddressState,
  items: ItemRow[],
  variantOptions: VariantOption[],
): FormErrors {
  const errors: FormErrors = {};

  if (!clienteId) {
    errors.clienteId = 'Selecciona un cliente';
  }
  if (!metodoPago.trim()) {
    errors.metodoPago = 'Selecciona un método de pago';
  }

  const addressErrors: AddressErrors = {};
  if (!address.calle.trim()) addressErrors.calle = 'La calle es obligatoria';
  if (!address.numero.trim()) addressErrors.numero = 'El número es obligatorio';
  if (!address.colonia.trim()) addressErrors.colonia = 'La colonia es obligatoria';
  if (!address.ciudad.trim()) addressErrors.ciudad = 'La ciudad es obligatoria';
  if (!address.estado) addressErrors.estado = 'Selecciona el estado';
  if (!address.codigoPostal.trim()) addressErrors.codigoPostal = 'El código postal es obligatorio';
  if (Object.keys(addressErrors).length > 0) errors.address = addressErrors;

  const itemErrors: Record<string, ItemErrors> = {};
  for (const row of items) {
    const rowErrors: ItemErrors = {};

    if (!row.variantId) {
      rowErrors.variantId = 'Selecciona un producto';
    }

    const cantidad = Number(row.cantidad);
    if (!row.cantidad.trim() || Number.isNaN(cantidad) || cantidad <= 0) {
      rowErrors.cantidad = 'Debe ser mayor a 0';
    } else if (row.variantId) {
      const variant = variantOptions.find((o) => o.id === row.variantId);
      if (variant && cantidad > variant.stock) {
        rowErrors.cantidad = `Máx. disponible: ${variant.stock}`;
      }
    }

    if (Object.keys(rowErrors).length > 0) itemErrors[row.key] = rowErrors;
  }
  // Siempre debe existir al menos un producto en la venta.
  if (items.length === 0) {
    itemErrors['__empty__'] = { variantId: 'Agrega al menos un producto' };
  }
  if (Object.keys(itemErrors).length > 0) errors.items = itemErrors;

  return errors;
}

export function CreateOrderForm({ open, onOpenChange, onSuccess }: CreateOrderFormProps) {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [mexicanStates, setMexicanStates] = useState<MexicanState[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [address, setAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [items, setItems] = useState<ItemRow[]>([createEmptyItemRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;

    setClienteId('');
    setMetodoPago('');
    setAddress(EMPTY_ADDRESS);
    setItems([createEmptyItemRow()]);
    setFieldErrors({});

    setIsLoadingOptions(true);
    Promise.all([
      apiClient.get<Customer[]>('/customers'),
      apiClient.get<PaginatedResult<Product>>('/products?limit=100'),
      apiClient.get<PaymentMethod[]>('/payment-methods'),
      apiClient.get<MexicanState[]>('/mexican-states'),
    ])
      .then(([customersRes, productsRes, paymentMethodsRes, mexicanStatesRes]) => {
        setCustomers(customersRes);
        setVariantOptions(buildVariantOptions(productsRes.data));
        setPaymentMethods(paymentMethodsRes);
        setMexicanStates(mexicanStatesRes);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : 'No se pudieron cargar clientes/productos';
        toast({ title: 'Error', description: message, variant: 'destructive' });
      })
      .finally(() => setIsLoadingOptions(false));
  }, [open, toast]);

  const updateAddressField = <K extends keyof AddressState>(field: K, value: AddressState[K]) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors.address?.[field]) {
      setFieldErrors((prev) => ({ ...prev, address: { ...prev.address, [field]: undefined } }));
    }
  };

  const updateItem = (key: string, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
    if (fieldErrors.items?.[key]?.[field as keyof ItemErrors]) {
      setFieldErrors((prev) => ({
        ...prev,
        items: { ...prev.items, [key]: { ...prev.items?.[key], [field]: undefined } },
      }));
    }
  };

  const addItemRow = () => setItems((prev) => [...prev, createEmptyItemRow()]);
  const removeItemRow = (key: string) => setItems((prev) => prev.filter((row) => row.key !== key));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateOrderForm(clienteId, metodoPago, address, items, variantOptions);
    const hasErrors =
      errors.clienteId ||
      errors.metodoPago ||
      (errors.address && Object.keys(errors.address).length > 0) ||
      (errors.items && Object.keys(errors.items).length > 0);

    if (hasErrors) {
      setFieldErrors(errors);
      toast({
        title: 'Revisa el formulario',
        description: 'Hay campos obligatorios pendientes o inválidos.',
        variant: 'destructive',
      });
      return;
    }

    setFieldErrors({});
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clienteId" className={FIELD_LABEL_CLASS}>
                  Cliente
                </Label>
                {/* value guarda el id del cliente (lo que espera el backend);
                    SelectValue recibe el .nombre resuelto como children para
                    que el trigger nunca muestre el UUID crudo. */}
                <Select
                  value={clienteId}
                  onValueChange={(value) => {
                    setClienteId(value);
                    if (fieldErrors.clienteId) setFieldErrors((prev) => ({ ...prev, clienteId: undefined }));
                  }}
                  disabled={isLoadingOptions}
                >
                  <SelectTrigger
                    id="clienteId"
                    className={fieldErrors.clienteId ? SELECT_ERROR_CLASS : undefined}
                  >
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
                {fieldErrors.clienteId && (
                  <p className="text-xs font-medium text-red-500">{fieldErrors.clienteId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodoPago" className={FIELD_LABEL_CLASS}>
                  Método de pago
                </Label>
                <Select
                  value={metodoPago}
                  onValueChange={(value) => {
                    setMetodoPago(value);
                    if (fieldErrors.metodoPago) setFieldErrors((prev) => ({ ...prev, metodoPago: undefined }));
                  }}
                  disabled={isSubmitting || isLoadingOptions}
                >
                  <SelectTrigger
                    id="metodoPago"
                    className={fieldErrors.metodoPago ? SELECT_ERROR_CLASS : undefined}
                  >
                    <SelectValue placeholder="Tarjeta, transferencia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.nombre}>
                        {method.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.metodoPago && (
                  <p className="text-xs font-medium text-red-500">{fieldErrors.metodoPago}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-800 dark:text-blue-200/90">
                Dirección de envío
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input
                    placeholder="Calle"
                    value={address.calle}
                    onChange={(e) => updateAddressField('calle', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.address?.calle)}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.address?.calle && (
                    <p className="text-xs font-medium text-red-500">{fieldErrors.address.calle}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Número"
                    value={address.numero}
                    onChange={(e) => updateAddressField('numero', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.address?.numero)}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.address?.numero && (
                    <p className="text-xs font-medium text-red-500">{fieldErrors.address.numero}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Colonia"
                    value={address.colonia}
                    onChange={(e) => updateAddressField('colonia', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.address?.colonia)}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.address?.colonia && (
                    <p className="text-xs font-medium text-red-500">{fieldErrors.address.colonia}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Ciudad"
                    value={address.ciudad}
                    onChange={(e) => updateAddressField('ciudad', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.address?.ciudad)}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.address?.ciudad && (
                    <p className="text-xs font-medium text-red-500">{fieldErrors.address.ciudad}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Select
                    value={address.estado}
                    onValueChange={(value) => updateAddressField('estado', value)}
                    disabled={isSubmitting || isLoadingOptions}
                  >
                    <SelectTrigger className={fieldErrors.address?.estado ? SELECT_ERROR_CLASS : undefined}>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {mexicanStates.map((state) => (
                        <SelectItem key={state.id} value={state.nombre}>
                          {state.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.address?.estado && (
                    <p className="text-xs font-medium text-red-500">{fieldErrors.address.estado}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Código Postal"
                    value={address.codigoPostal}
                    onChange={(e) => updateAddressField('codigoPostal', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.address?.codigoPostal)}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.address?.codigoPostal && (
                    <p className="text-xs font-medium text-red-500">
                      {fieldErrors.address.codigoPostal}
                    </p>
                  )}
                </div>
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
                  className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar producto
                </Button>
              </div>

              {fieldErrors.items?.['__empty__'] && (
                <p className="text-xs font-medium text-red-500">
                  {fieldErrors.items['__empty__'].variantId}
                </p>
              )}

              <div className="space-y-2">
                {items.map((row, index) => {
                  const selectedVariant = variantOptions.find((o) => o.id === row.variantId);
                  const rowErrors = fieldErrors.items?.[row.key];
                  return (
                    <div
                      key={row.key}
                      className="space-y-3 rounded-lg border border-blue-200/70 border-l-4 border-l-blue-400 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:border-l-blue-500 dark:bg-blue-950/10"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-blue-700/70 dark:text-blue-300/60">
                          Producto #{index + 1}
                        </p>
                        {selectedVariant && (
                          <p className="text-xs text-muted-foreground">
                            Stock disponible: {selectedVariant.stock}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-[1fr_100px_auto] items-start gap-2">
                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>Producto / Variante</Label>
                          {/* Mismo patrón: value = id de la variante, SelectValue
                              muestra el label legible resuelto localmente. */}
                          <Select
                            value={row.variantId}
                            onValueChange={(value) => updateItem(row.key, 'variantId', value)}
                            disabled={isSubmitting || isLoadingOptions}
                          >
                            <SelectTrigger
                              className={rowErrors?.variantId ? SELECT_ERROR_CLASS : undefined}
                            >
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
                          {rowErrors?.variantId && (
                            <p className="text-xs font-medium text-red-500">{rowErrors.variantId}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className={FIELD_LABEL_CLASS}>Cantidad</Label>
                          <Input
                            type="number"
                            min={1}
                            max={selectedVariant?.stock}
                            value={row.cantidad}
                            onChange={(e) => updateItem(row.key, 'cantidad', e.target.value)}
                            aria-invalid={Boolean(rowErrors?.cantidad)}
                            disabled={isSubmitting}
                          />
                          {rowErrors?.cantidad && (
                            <p className="text-xs font-medium text-red-500">{rowErrors.cantidad}</p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeItemRow(row.key)}
                          disabled={isSubmitting || items.length === 1}
                          title="Quitar producto"
                          className="justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                          Quitar
                        </Button>
                      </div>
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
