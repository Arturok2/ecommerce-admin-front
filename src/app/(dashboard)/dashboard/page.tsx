'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Users, Trophy } from 'lucide-react';
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
import type { DashboardMetrics } from '@/components/dashboard/types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    let isMounted = true;

    apiClient
      .get<DashboardMetrics>('/dashboard/metrics')
      .then((data) => {
        if (isMounted) setMetrics(data);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMetrics(false);
      });

    apiClient
      .get<PaginatedResult<OrderSummary>>('/orders?limit=5')
      .then((res) => {
        if (isMounted) setRecentOrders(res.data);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen general de la operación del e-commerce.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tarjeta 1: Ventas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total de Ventas (Ingresos)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics || !metrics ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(metrics.ventas.ultimos30Dias)}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">Últimos 30 días</p>

            <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="text-slate-400">Hoy: </span>
                <span className="font-medium text-slate-600">
                  {isLoadingMetrics || !metrics ? '—' : formatCurrency(metrics.ventas.hoy)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Últimos 7 días: </span>
                <span className="font-medium text-slate-600">
                  {isLoadingMetrics || !metrics ? '—' : formatCurrency(metrics.ventas.ultimos7Dias)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Órdenes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Órdenes Totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics || !metrics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                {metrics.ordenes.ultimos30Dias.toLocaleString('es-MX')}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">Últimos 30 días</p>

            <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="text-slate-400">Hoy: </span>
                <span className="font-medium text-slate-600">
                  {isLoadingMetrics || !metrics ? '—' : metrics.ordenes.hoy.toLocaleString('es-MX')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Últimos 7 días: </span>
                <span className="font-medium text-slate-600">
                  {isLoadingMetrics || !metrics
                    ? '—'
                    : metrics.ordenes.ultimos7Dias.toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 3: Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Clientes Registrados
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics || !metrics ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">
                {metrics.clientes.total.toLocaleString('es-MX')}
              </p>
            )}
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
              {isLoadingMetrics || !metrics ? (
                '—'
              ) : (
                <>
                  <span className="font-medium text-green-600">
                    +{metrics.clientes.nuevosUltimos30Dias}
                  </span>{' '}
                  Nuevos (Últimos 30 días)
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Tarjeta 4: Top 5 Productos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Top 5 Productos Más Vendidos (30 días)
            </CardTitle>
            <Trophy className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoadingMetrics || !metrics ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : metrics.topProductos.length === 0 ? (
              <p className="text-sm text-slate-500">Sin ventas en este período</p>
            ) : (
              <ol className="space-y-2">
                {metrics.topProductos.map((producto, index) => (
                  <li
                    key={producto.productId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-6 shrink-0 font-mono text-xs text-slate-400">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-700">{producto.nombre}</p>
                        <p className="truncate text-xs text-slate-400">{producto.marca}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                      {producto.unidadesVendidas} unidades
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Órdenes recientes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Últimas Órdenes Recientes</h2>

        <div className="rounded-lg border border-slate-200 bg-white">
          {isLoadingOrders ? (
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
                <li
                  key={order.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
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
