'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  ESTADO_ORDEN_OPTIONS,
  formatCurrency,
  formatDateTime,
  type EstadoOrden,
  type OrderDetail,
} from './types';
import { getEstadoBadgeClass } from './estado-badge';

interface OrderDetailsModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void; // Refresca la tabla principal de fondo
}

// Sub-título de cada bloque de la orden (Cliente y Envío, Pago e Ítems, etc.):
// mismo peso visual en toda la ficha, tono lavanda pastel en modo oscuro.
const SECTION_TITLE_CLASS = 'text-sm font-semibold text-slate-800 dark:text-blue-200/90';
// Pares dt/dd de datos: la etiqueta un poco más apagada que el valor.
const DT_CLASS = 'inline font-medium text-slate-500 dark:text-blue-300/50';
const DD_CLASS = 'inline text-slate-700 dark:text-blue-100/90';

// Rango del flujo normal de una orden: solo se puede avanzar
// (EN_PREPARACION → ENVIADO → COMPLETADO), nunca retroceder — ej. si ya
// pasó a ENVIADO, no puede volver a EN_PREPARACION.
const ESTADO_RANK: Partial<Record<EstadoOrden, number>> = {
  EN_PREPARACION: 0,
  ENVIADO: 1,
  COMPLETADO: 2,
};

// CANCELADO es la única excepción al flujo lineal: se puede cancelar desde
// cualquier estado que no sea ya un estado final (COMPLETADO o CANCELADO).
// COMPLETADO y CANCELADO son estados finales — desde ahí ya no se permite
// ningún otro cambio.
function isValidTransition(current: EstadoOrden, target: EstadoOrden): boolean {
  if (target === current) return false;
  if (current === 'COMPLETADO' || current === 'CANCELADO') return false;
  if (target === 'CANCELADO') return true;

  const currentRank = ESTADO_RANK[current] ?? 0;
  const targetRank = ESTADO_RANK[target] ?? 0;
  return targetRank > currentRank;
}

export function OrderDetailsModal({
  orderId,
  open,
  onOpenChange,
  onStatusUpdated,
}: OrderDetailsModalProps) {
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [nuevoEstado, setNuevoEstado] = useState<EstadoOrden | ''>('');
  const [nota, setNota] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [estadoError, setEstadoError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
      setOrder(data);
      setNuevoEstado('');
      setNota('');
      setEstadoError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo cargar la orden';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && orderId) {
      fetchOrder();
    } else {
      setOrder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const handleUpdateStatus = async () => {
    if (!orderId || !nuevoEstado) {
      setEstadoError('Selecciona el nuevo estado');
      return;
    }

    if (order && !isValidTransition(order.estadoOrden, nuevoEstado)) {
      setEstadoError(
        order.estadoOrden === 'COMPLETADO' || order.estadoOrden === 'CANCELADO'
          ? `La orden ya está en un estado final (${order.estadoOrden}) y no admite más cambios`
          : `No puede retroceder de ${order.estadoOrden} a ${nuevoEstado}`,
      );
      return;
    }

    setEstadoError(null);
    setIsUpdating(true);
    try {
      const updated = await apiClient.patch<OrderDetail>(`/orders/${orderId}/status`, {
        estado: nuevoEstado,
        nota: nota.trim() || undefined,
      });

      setOrder(updated);
      setNuevoEstado('');
      setNota('');

      toast({ title: 'Estado de la orden actualizado' });
      onStatusUpdated(); // Refresca la tabla de fondo
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo actualizar el estado';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* p-0 + flex-col: header y footer fijos, el body es el único
          scrolleable — evita que órdenes con historial largo desborden
          la pantalla. */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-md flex-col overflow-hidden p-0 md:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="shrink-0 gap-1 border-b bg-background p-6">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl dark:text-blue-200">
              Gestionar Orden
            </DialogTitle>
            {order && (
              <>
                <span className="font-mono text-sm text-slate-500 dark:text-blue-300/60">
                  #{order.numeroOrden}
                </span>
                <Badge variant="outline" className={getEstadoBadgeClass(order.estadoOrden)}>
                  {order.estadoOrden}
                </Badge>
              </>
            )}
          </div>
          <DialogDescription className="text-slate-600 dark:text-blue-300/70">
            Detalle completo de la venta, historial de cambios y actualización de estado.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body: único bloque con scroll vertical */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !order ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Grid de 2 columnas: Cliente/Envío | Pago/Items */}
              <div className="grid grid-cols-2 gap-6">
                <section className="space-y-3 rounded-lg border border-border p-4">
                  <h3 className={SECTION_TITLE_CLASS}>Cliente y Envío</h3>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className={DT_CLASS}>Nombre: </dt>
                      <dd className={DD_CLASS}>{order.cliente.nombre}</dd>
                    </div>
                    <div>
                      <dt className={DT_CLASS}>Email: </dt>
                      <dd className={DD_CLASS}>{order.cliente.email}</dd>
                    </div>
                    <div>
                      <dt className={DT_CLASS}>Teléfono: </dt>
                      <dd className={DD_CLASS}>{order.cliente.telefono}</dd>
                    </div>
                  </dl>

                  {order.direccionEnvio && (
                    <div className="border-t border-border pt-3 text-sm text-slate-600 dark:text-blue-100/80">
                      <p>
                        {order.direccionEnvio.calle} {order.direccionEnvio.numeroExt}
                        {order.direccionEnvio.numeroInt ? ` Int. ${order.direccionEnvio.numeroInt}` : ''}
                      </p>
                      <p>{order.direccionEnvio.colonia}</p>
                      <p>
                        {order.direccionEnvio.ciudad}, {order.direccionEnvio.estadoMx} —{' '}
                        {order.direccionEnvio.codigoPostal}
                      </p>
                    </div>
                  )}
                </section>

                <section className="space-y-3 rounded-lg border border-border p-4">
                  <h3 className={SECTION_TITLE_CLASS}>Pago e Ítems</h3>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className={DT_CLASS}>Método de pago: </dt>
                      <dd className={DD_CLASS}>{order.metodoPago}</dd>
                    </div>
                    <div>
                      <dt className={DT_CLASS}>Estado de pago: </dt>
                      <dd className={DD_CLASS}>{order.estadoPago}</dd>
                    </div>
                  </dl>

                  <div className="space-y-1.5 border-t border-border pt-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-blue-100/80">
                          {item.variante.producto.nombre}{' '}
                          <span className="text-slate-400 dark:text-blue-300/40">
                            ({item.variante.atributos.map((a) => a.valor).join(' / ')})
                          </span>{' '}
                          × {item.cantidad}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-blue-100">
                          {formatCurrency(item.precioUnitario)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-slate-900 dark:text-blue-100">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </section>
              </div>

              {/* Timeline / Historial de modificaciones */}
              <section className="space-y-3">
                <h3 className={SECTION_TITLE_CLASS}>Historial de Modificaciones</h3>

                <ol className="space-y-4 border-l-2 border-border pl-4">
                  {order.historial.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getEstadoBadgeClass(entry.estado)}>
                          {entry.estado}
                        </Badge>
                        <span className="text-xs text-slate-400 dark:text-blue-300/40">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>
                      {entry.nota && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-blue-100/80">{entry.nota}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-blue-300/40">
                        Por: {entry.admin.email}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Formulario de cambio de estado */}
              <section className="space-y-3 rounded-lg border border-border p-4">
                <h3 className={SECTION_TITLE_CLASS}>Actualizar Estado</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Select
                      value={nuevoEstado}
                      onValueChange={(value) => {
                        setNuevoEstado(value as EstadoOrden);
                        setEstadoError(null);
                      }}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className={estadoError ? 'border-red-500 ring-3 ring-red-500/20' : undefined}>
                        <SelectValue placeholder="Selecciona el nuevo estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADO_ORDEN_OPTIONS.map((estado) => (
                          <SelectItem
                            key={estado}
                            value={estado}
                            disabled={!isValidTransition(order.estadoOrden, estado)}
                          >
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {estadoError && <p className="text-xs font-medium text-red-500">{estadoError}</p>}
                  </div>

                  <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                    {isUpdating ? 'Actualizando...' : 'Actualizar Estado'}
                  </Button>
                </div>

                <Textarea
                  placeholder="Nota (opcional)"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  disabled={isUpdating}
                  rows={2}
                />
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
