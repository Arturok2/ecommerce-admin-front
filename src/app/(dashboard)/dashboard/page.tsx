'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, Users, Trophy, ArrowRight } from 'lucide-react';
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

// Cada métrica tiene su propio matiz dentro de la familia azul (blue, sky,
// cyan, indigo): mismo lenguaje visual, pero suficiente variación para que
// las 4 tarjetas se distingan de un vistazo — look "pro" tipo Stripe/Vercel
// en vez de 4 bloques idénticos con solo el ícono cambiando.
const ACCENTS = {
  blue: {
    bar: 'from-blue-500 to-blue-400/30',
    badge: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300',
    ring: 'hover:border-blue-400/40 hover:shadow-blue-500/10',
  },
  sky: {
    bar: 'from-sky-500 to-sky-400/30',
    badge: 'bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300',
    ring: 'hover:border-sky-400/40 hover:shadow-sky-500/10',
  },
  cyan: {
    bar: 'from-cyan-500 to-cyan-400/30',
    badge: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300',
    ring: 'hover:border-cyan-400/40 hover:shadow-cyan-500/10',
  },
  indigo: {
    bar: 'from-indigo-500 to-indigo-400/30',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300',
    ring: 'hover:border-indigo-400/40 hover:shadow-indigo-500/10',
  },
} as const;

// Envoltorio común de las 4 tarjetas de métricas: barra de acento superior,
// ícono en badge de color y elevación sutil al pasar el mouse.
function MetricCard({
  accent,
  icon,
  title,
  children,
}: {
  accent: keyof typeof ACCENTS;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const { bar, badge, ring } = ACCENTS[accent];
  return (
    <Card
      className={`relative border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${ring}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${badge}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-200">Dashboard</h1>
        <p className="mt-1 text-sm text-blue-600/70 dark:text-blue-300/40">
          Estadísticas recientes de la operación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tarjeta 1: Ventas */}
        <MetricCard accent="blue" title="Total de Ventas (Ingresos)" icon={<DollarSign className="h-5 w-5" />}>
          {isLoadingMetrics || !metrics ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-50">
              {formatCurrency(metrics.ventas.ultimos30Dias)}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Últimos 30 días</p>

          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Hoy: </span>
              <span className="font-medium text-foreground/80">
                {isLoadingMetrics || !metrics ? '—' : formatCurrency(metrics.ventas.hoy)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Últimos 7 días: </span>
              <span className="font-medium text-foreground/80">
                {isLoadingMetrics || !metrics ? '—' : formatCurrency(metrics.ventas.ultimos7Dias)}
              </span>
            </div>
          </div>
        </MetricCard>

        {/* Tarjeta 2: Órdenes */}
        <MetricCard accent="sky" title="Órdenes Totales" icon={<ShoppingCart className="h-5 w-5" />}>
          {isLoadingMetrics || !metrics ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-50">
              {metrics.ordenes.ultimos30Dias.toLocaleString('es-MX')}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Últimos 30 días</p>

          <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Hoy: </span>
              <span className="font-medium text-foreground/80">
                {isLoadingMetrics || !metrics ? '—' : metrics.ordenes.hoy.toLocaleString('es-MX')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Últimos 7 días: </span>
              <span className="font-medium text-foreground/80">
                {isLoadingMetrics || !metrics
                  ? '—'
                  : metrics.ordenes.ultimos7Dias.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </MetricCard>

        {/* Tarjeta 3: Clientes */}
        <MetricCard accent="cyan" title="Clientes Registrados" icon={<Users className="h-5 w-5" />}>
          {isLoadingMetrics || !metrics ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-50">
              {metrics.clientes.total.toLocaleString('es-MX')}
            </p>
          )}
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {isLoadingMetrics || !metrics ? (
              '—'
            ) : (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  +{metrics.clientes.nuevosUltimos30Dias}
                </span>{' '}
                Nuevos (Últimos 30 días)
              </>
            )}
          </p>
        </MetricCard>

        {/* Tarjeta 4: Top 5 Productos */}
        <MetricCard
          accent="indigo"
          title="Top 5 Productos Más Vendidos (30 días)"
          icon={<Trophy className="h-5 w-5" />}
        >
          {isLoadingMetrics || !metrics ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : metrics.topProductos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas en este período</p>
          ) : (
            <ol className="space-y-2">
              {metrics.topProductos.map((producto, index) => (
                <li
                  key={producto.productId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground/90">{producto.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{producto.marca}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                    {producto.unidadesVendidas} unidades
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </MetricCard>
      </div>

      {/* Órdenes recientes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-blue-100">
          Órdenes Recientes
        </h2>

        <div className="rounded-lg border border-border bg-card">
          {isLoadingOrders ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Aún no hay órdenes registradas
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-blue-500/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-mono text-sm text-foreground/90">{order.numeroOrden}</p>
                    <p className="text-xs text-muted-foreground">
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

        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver todas las órdenes <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
