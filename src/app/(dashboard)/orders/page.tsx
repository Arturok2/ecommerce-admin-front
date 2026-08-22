'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { CreateOrderForm } from '@/components/orders/create-order-form';
import { OrderDetailsModal } from '@/components/orders/order-details-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import {
  formatCurrency,
  formatDateTime,
  type OrderSummary,
  type PaginatedResult,
} from '@/components/orders/types';
import { getEstadoBadgeClass } from '@/components/orders/estado-badge';

export default function OrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<PaginatedResult<OrderSummary>>('/orders?limit=50');
      setOrders(res.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar las órdenes';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleManageClick = (order: OrderSummary) => {
    setSelectedOrderId(order.id);
    setIsDetailsOpen(true);
  };

  const columns = useMemo<ColumnDef<OrderSummary>[]>(
    () => [
      {
        accessorKey: 'numeroOrden',
        header: 'Número de Orden',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.numeroOrden}</span>,
      },
      {
        id: 'cliente',
        header: 'Cliente',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.cliente.nombre}</p>
            <p className="text-xs text-slate-500">{row.original.cliente.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Fecha de Creación',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.total)}</span>,
      },
      {
        accessorKey: 'estadoOrden',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant="outline" className={getEstadoBadgeClass(row.original.estadoOrden)}>
            {row.original.estadoOrden}
          </Badge>
        ),
      },
      {
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => handleManageClick(row.original)}>
            <Eye className="mr-2 h-4 w-4" />
            Gestionar
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Órdenes / Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta, filtra y da seguimiento a las ventas registradas.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>Generar Venta Ficticia</Button>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        searchPlaceholder="Buscar por cliente o número de orden..."
        emptyMessage="No se encontraron órdenes"
      />

      <CreateOrderForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchOrders}
      />

      <OrderDetailsModal
        orderId={selectedOrderId}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onStatusUpdated={fetchOrders}
      />
    </div>
  );
}
