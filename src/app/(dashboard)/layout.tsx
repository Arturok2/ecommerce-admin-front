'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderTree, Package, ShoppingCart, Users, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const isLinkActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  // Reutilizado tanto en el sidebar de escritorio como en el drawer móvil,
  // para no duplicar la lista de enlaces en dos lugares distintos.
  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="mt-4 flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isLinkActive(href)
              ? 'bg-indigo-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const renderLogoutButton = () => (
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
  );

  // Evita el "flash" del layout protegido mientras se valida la sesión
  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar de escritorio: oculto en móvil, fijo desde md: en adelante */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col md:justify-between md:border-r md:border-slate-800 md:bg-slate-900">
        <div>
          <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight text-white">
            OMS Admin
          </div>
          {renderNavLinks()}
        </div>
        {renderLogoutButton()}
      </aside>

      {/* Navbar móvil: solo visible por debajo de md: */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <span className="text-lg font-semibold tracking-tight text-slate-900">Admin Panel</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Drawer móvil (Shadcn Sheet): mismo contenido de navegación que el sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="left"
          className="flex w-64 flex-col justify-between border-slate-800 bg-slate-900 p-0 text-slate-100"
        >
          <div>
            <SheetTitle className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight text-white">
              OMS Admin
            </SheetTitle>
            {renderNavLinks(() => setIsMobileMenuOpen(false))}
          </div>
          {renderLogoutButton()}
        </SheetContent>
      </Sheet>

      {/* Contenido principal: sin margen en móvil, con margen igual al ancho del sidebar desde md: */}
      <main className="md:pl-64">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
