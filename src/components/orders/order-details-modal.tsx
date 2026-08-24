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

  const fetchOrder = async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
      setOrder(data);
      setNuevoEstado('');
      setNota('');
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
      toast({
        title: 'Selecciona un estado',
        description: 'Elige el nuevo estado antes de actualizar.',
        variant: 'destructive',
      });
      return;
    }

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
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto md:max-w-3xl lg:max-w-[45vw]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">Gestionar Orden</DialogTitle>
            {order && (
              <>
                <span className="font-mono text-sm text-slate-500">#{order.numeroOrden}</span>
                <Badge variant="outline" className={getEstadoBadgeClass(order.estadoOrden)}>
                  {order.estadoOrden}
                </Badge>
              </>
            )}
          </div>
          <DialogDescription>
            Detalle completo de la venta, historial de cambios y actualización de estado.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Grid de 2 columnas: Cliente/Envío | Pago/Items */}
            <div className="grid grid-cols-2 gap-6">
              <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Cliente y Envío</h3>
                <dl className="space-y-1 text-sm text-slate-600">
                  <div>
                    <dt className="inline font-medium text-slate-500">Nombre: </dt>
                    <dd className="inline">{order.cliente.nombre}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-slate-500">Email: </dt>
                    <dd className="inline">{order.cliente.email}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-slate-500">Teléfono: </dt>
                    <dd className="inline">{order.cliente.telefono}</dd>
                  </div>
                </dl>

                {order.direccionEnvio && (
                  <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
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

              <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Pago e Ítems</h3>
                <dl className="space-y-1 text-sm text-slate-600">
                  <div>
                    <dt className="inline font-medium text-slate-500">Método de pago: </dt>
                    <dd className="inline">{order.metodoPago}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-slate-500">Estado de pago: </dt>
                    <dd className="inline">{order.estadoPago}</dd>
                  </div>
                </dl>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {item.variante.producto.nombre}{' '}
                        <span className="text-slate-400">
                          ({item.variante.atributos.map((a) => a.valor).join(' / ')})
                        </span>{' '}
                        × {item.cantidad}
                      </span>
                      <span className="font-medium">{formatCurrency(item.precioUnitario)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </section>
            </div>

            {/* Timeline / Historial de modificaciones */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Historial de Modificaciones</h3>

              <ol className="space-y-4 border-l-2 border-slate-200 pl-4">
                {order.historial.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getEstadoBadgeClass(entry.estado)}>
                        {entry.estado}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    {entry.nota && <p className="mt-1 text-sm text-slate-600">{entry.nota}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">Por: {entry.admin.email}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Formulario de cambio de estado */}
            <section className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Actualizar Estado</h3>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={nuevoEstado}
                  onValueChange={(value) => setNuevoEstado(value as EstadoOrden)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el nuevo estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_ORDEN_OPTIONS.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
      </DialogContent>
    </Dialog>
  );
}
