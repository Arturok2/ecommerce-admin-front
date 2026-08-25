'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { CustomerForm } from '@/components/customers/customer-form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
// Reutilizamos el tipo Customer que ya definimos para el módulo de órdenes,
// para no duplicar la misma forma de datos en dos archivos.
import type { Customer } from '@/components/orders/types';

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) ?? '';
  return initials.toUpperCase();
}

export default function CustomersPage() {
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Customer[]>('/customers');
      setCustomers(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudieron cargar los clientes';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: 'iniciales',
        header: '',
        cell: ({ row }) => (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
            {getInitials(row.original.nombre)}
          </div>
        ),
      },
      {
        accessorKey: 'nombre',
        header: 'Nombre Completo',
        cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
      },
      {
        accessorKey: 'email',
        header: 'Correo Electrónico',
      },
      {
        accessorKey: 'telefono',
        header: 'Teléfono',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-blue-200">Clientes</h1>
          <p className="mt-1 text-sm text-blue-600/70 dark:text-blue-300/40">
            Consulta y registra los clientes asociados a las ventas.
          </p>
        </div>

        <Button onClick={() => setIsFormOpen(true)}>+ Nuevo Cliente</Button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        searchPlaceholder="Buscar cliente..."
        emptyMessage="No se encontraron clientes"
      />

      <CustomerForm open={isFormOpen} onOpenChange={setIsFormOpen} onSuccess={fetchCustomers} />
    </div>
  );
}
