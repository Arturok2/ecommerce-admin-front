'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { apiClient, setToken, ApiError } from '@/lib/api-client';

interface LoginResponse {
  access_token: string;
  admin: {
    id: string;
    email: string;
  };
}

// Formato de correo razonablemente estricto sin llegar a la complejidad de
// la RFC completa (que es innecesaria para un login).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// "Formato válido" para la contraseña: mínimo 8 caracteres, al menos una
// letra y al menos un número. Ajustable si el backend exige otra regla.
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validateCredentials(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!trimmedEmail) {
    errors.email = 'El correo es obligatorio';
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Ingresa un correo válido';
  }

  if (!trimmedPassword) {
    errors.password = 'La contraseña es obligatoria';
  } else if (!PASSWORD_REGEX.test(trimmedPassword)) {
    errors.password = 'Mínimo 8 caracteres, con al menos una letra y un número';
  }

  return errors;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const errors = validateCredentials(email, password);

    if (errors.email || errors.password) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      // apiClient exporta setToken como función independiente (no como método
      // del objeto apiClient) — se encarga de guardarlo en localStorage.
      setToken(response.access_token);

      router.replace('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401 || err.status === 400
            ? 'Correo o contraseña incorrectos'
            : err.message
          : 'Ocurrió un error inesperado, intenta de nuevo';

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      {/* Fondo degradado tipo "aurora": tres blobs de color desenfocados que
          se superponen. Es 100% CSS (sin imágenes) y queda igual de vívido
          sin importar si el resto de la app está en modo claro u oscuro —
          el login es la "portada" y tiene su propia identidad visual. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-sky-500/40 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-blue-600/30 blur-3xl" />
        {/* Textura sutil de grano/rejilla para que el degradado no se vea "plano" */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Marca */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-sky-500/30">
            OMS
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">OMS Admin</h1>
          <p className="text-sm text-white/60">Panel de operación del e-commerce</p>
        </div>

        {/* Tarjeta "glass": semi-transparente + blur, con los tokens de tema
            normales por dentro (respeta modo claro/oscuro del resto de la app). */}
        <Card className="border-white/10 bg-card/90 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-[1.75rem] leading-tight font-bold tracking-tight text-transparent dark:from-sky-400 dark:to-blue-400">
              Bienvenido de nuevo
            </CardTitle>
            <CardDescription className="text-[13px]">
              Ingresa tus credenciales para acceder al panel
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    disabled={isLoading}
                    className="h-11 rounded-lg pl-10 focus-visible:border-sky-500 focus-visible:ring-sky-500/30"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs font-medium text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    disabled={isLoading}
                    className="h-11 rounded-lg pr-10 pl-10 focus-visible:border-sky-500 focus-visible:ring-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs font-medium text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-red-500">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full mb-3 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/20 hover:from-sky-500 hover:to-blue-500"
                disabled={isLoading}
              >
                {isLoading ? 'Cargando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
