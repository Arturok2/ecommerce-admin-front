import { redirect } from 'next/navigation';

// La raíz del sitio no renderiza contenido propio: siempre redirige al login.
// El layout de (dashboard) se encarga de redirigir de vuelta a /dashboard
// si el usuario ya tiene una sesión activa.
export default function RootPage() {
  redirect('/login');
}
