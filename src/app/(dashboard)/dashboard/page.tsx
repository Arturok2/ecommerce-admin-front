'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Package, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import {
  formatCurrency,
  formatDateTime,
  type OrderSummary,
  type PaginatedResult,
} from '@/components/orders/types';
import { getEstadoBadgeClass } from '@/components/orders/estado-badge';
import type { Product } from '@/components/products/types';
import type { Customer } from '@/components/orders/types';

interface DashboardMetrics {
  totalIngresos: number;
  totalOrdenes: number;
  productosActivos: number;
  totalClientes: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // No existe un endpoint de métricas agregadas en el backend, así que los
    // indicadores se calculan aquí a partir de los endpoints ya existentes.
    // "Productos Activos" y "Total de Ventas" son aproximados si el catálogo
    // supera el límite de la página consultada (100 registros).
    Promise.all([
      apiClient.get<PaginatedResult<OrderSummary>>('/orders?limit=100'),
      apiClient.get<PaginatedResult<Product>>('/products?limit=100'),
      apiClient.get<Customer[]>('/customers'),
    ])
      .then(([ordersRes, productsRes, customers]) => {
        if (!isMounted) return;

        const totalIngresos = ordersRes.data.reduce((sum, order) => sum + Number(order.total), 0);
        const productosActivos = productsRes.data.filter((p) => p.estado === 'ACTIVO').length;

        setMetrics({
          totalIngresos,
          totalOrdenes: ordersRes.meta.total,
          productosActivos,
          totalClientes: customers.length,
        });
        setRecentOrders(ordersRes.data.slice(0, 5));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = [
    {
      label: 'Total de Ventas (Ingresos)',
      value: metrics ? formatCurrency(metrics.totalIngresos) : null,
      icon: DollarSign,
    },
    {
      label: 'Órdenes Totales',
      value: metrics ? metrics.totalOrdenes.toLocaleString('es-MX') : null,
      icon: ShoppingCart,
    },
    {
      label: 'Productos Activos',
      value: metrics ? metrics.productosActivos.toLocaleString('es-MX') : null,
      icon: Package,
    },
    {
      label: 'Clientes Registrados',
      value: metrics ? metrics.totalClientes.toLocaleString('es-MX') : null,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen general de la operación del e-commerce.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {value === null ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold tracking-tight">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Últimas 5 Órdenes Recientes</h2>

        <div className="rounded-lg border border-slate-200 bg-white">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Aún no hay órdenes registradas</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-mono text-sm">{order.numeroOrden}</p>
                    <p className="text-xs text-slate-500">
                      {order.cliente.nombre} — {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(order.total)}</span>
                    <Badge variant="outline" className={getEstadoBadgeClass(order.estadoOrden)}>
                      {order.estadoOrden}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href="/orders" className="text-sm font-medium text-indigo-600 hover:underline">
          Ver todas las órdenes →
        </Link>
      </section>
    </div>
  );
}
