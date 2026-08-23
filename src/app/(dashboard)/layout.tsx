'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderTree, Package, ShoppingCart, LogOut, Users } from 'lucide-react';
import { clearToken } from '@/lib/api-client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/categories', label: 'Categorías', icon: FolderTree },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/orders', label: 'Ventas', icon: ShoppingCart },
  { href: '/customers', label: 'Clientes', icon: Users },
] as const;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      router.replace('/login');
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  // Evita el "flash" del layout protegido mientras se valida la sesión
  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col justify-between border-r border-slate-800 bg-slate-900">
        <div>
          <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight text-white">
            Tennis Admin
          </div>

          <nav className="mt-4 flex flex-col gap-1 px-3">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname?.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
