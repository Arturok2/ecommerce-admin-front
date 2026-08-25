'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, Menu, Moon, Search, Settings, Sun, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { clearToken } from '@/lib/api-client';

interface TopNavbarProps {
  onMobileMenuClick: () => void;
}

/**
 * Decodifica el payload del JWT ya almacenado por el login (sub, email)
 * sin necesitar una librería ni un endpoint /auth/me — el backend ya
 * firma el email dentro del propio token.
 */
function getAdminEmailFromToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const payloadSegment = token.split('.')[1];
    const json = atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { email?: string };
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export function TopNavbar({ onMobileMenuClick }: TopNavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Evita el mismatch de hidratación: el tema real solo se conoce en cliente
  const [mounted, setMounted] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setAdminEmail(getAdminEmailFromToken());
  }, []);

  const initial = adminEmail?.[0]?.toUpperCase() ?? 'A';
  const isDark = mounted && theme === 'dark';

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        {/* Botón hamburguesa: solo en móvil, abre el drawer del layout */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMobileMenuClick}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="text-base font-semibold tracking-tight md:hidden">OMS Admin</span>

        {/* Buscador global — se oculta en móvil para no competir por espacio */}
        <div className="relative hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar en el panel..."
            className="h-9 border-none bg-muted/50 pl-9 shadow-none focus-visible:ring-1"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Notificaciones */}
          <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          </Button>

          {/* Selector de tema claro/oscuro */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cambiar tema"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>

          {/* Menú de perfil del administrador */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menú de perfil"
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">Administrador</p>
                <p className="truncate text-xs text-muted-foreground">{adminEmail ?? '—'}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
