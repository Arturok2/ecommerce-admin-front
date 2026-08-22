export type EstadoOrden = 'EN_PREPARACION' | 'ENVIADO' | 'COMPLETADO' | 'CANCELADO';

export const ESTADO_ORDEN_OPTIONS: EstadoOrden[] = [
  'EN_PREPARACION',
  'ENVIADO',
  'COMPLETADO',
  'CANCELADO',
];

export type EstadoPago = 'PAGADO' | 'FALLIDO';

export interface Customer {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
}

export interface ShippingAddress {
  calle: string;
  numeroExt: string;
  numeroInt?: string | null;
  colonia: string;
  ciudad: string;
  estadoMx: string;
  codigoPostal: string;
  pais: string;
  referencias?: string | null;
}

export interface VariantAttribute {
  id: string;
  tipo: string;
  valor: string;
}

export interface OrderItemVariant {
  id: string;
  sku: string;
  precio: string;
  producto: { id: string; nombre: string };
  atributos: VariantAttribute[];
}

export interface OrderItem {
  id: string;
  cantidad: number;
  precioUnitario: string; // Decimal serializado como string
  variante: OrderItemVariant;
}

export interface OrderHistoryEntry {
  id: string;
  estado: EstadoOrden;
  nota: string | null;
  createdAt: string;
  admin: { id: string; email: string };
}

export interface OrderSummary {
  id: string;
  numeroOrden: string;
  total: string;
  metodoPago: string;
  estadoPago: EstadoPago;
  estadoOrden: EstadoOrden;
  createdAt: string;
  cliente: Customer;
  _count: { items: number };
}

export interface OrderDetail {
  id: string;
  numeroOrden: string;
  total: string;
  metodoPago: string;
  estadoPago: EstadoPago;
  estadoOrden: EstadoOrden;
  trackingNumber: string | null;
  createdAt: string;
  cliente: Customer;
  direccionEnvio: ShippingAddress | null;
  items: OrderItem[];
  historial: OrderHistoryEntry[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function formatCurrency(value: string | number): string {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
