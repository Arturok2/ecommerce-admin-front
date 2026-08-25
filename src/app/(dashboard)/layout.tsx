'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderTree, Package, ShoppingCart, Users, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TopNavbar } from '@/components/shared/top-navbar';
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
  // para no duplicar la lista de enlaces en dos lugares distintos. Usa los
  // tokens --sidebar-* (definidos en globals.css) en vez de colores fijos,
  // así responde automáticamente al modo claro/oscuro.
  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="mt-4 flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            isLinkActive(href)
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const renderLogoutButton = () => (
    <div className="border-t border-sidebar-border p-3">
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );

  // Evita el "flash" del layout protegido mientras se valida la sesión
  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior: ocupa todo el ancho, por encima del sidebar y el contenido */}
      <TopNavbar onMobileMenuClick={() => setIsMobileMenuOpen(true)} />

      <div className="flex">
        {/* Sidebar de escritorio: hermano flex "sticky" bajo el navbar (no fixed),
            así el contenido se alinea solo sin depender de un padding fijo. */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar md:flex">
          <div>{renderNavLinks()}</div>
          {renderLogoutButton()}
        </aside>

        {/* Drawer móvil (Shadcn Sheet): mismo contenido de navegación que el sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="left"
            className="flex w-64 flex-col justify-between border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <div>
              <SheetTitle className="flex h-16 items-center px-6 text-lg font-semibold tracking-tight">
                OMS Admin
              </SheetTitle>
              {renderNavLinks(() => setIsMobileMenuOpen(false))}
            </div>
            {renderLogoutButton()}
          </SheetContent>
        </Sheet>

        {/* Contenido principal: flex-1 ocupa el espacio restante, sin números mágicos */}
        <main className="min-w-0 flex-1">
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
