import type { EstadoOrden } from './types';

const ESTADO_BADGE_CLASSES: Record<EstadoOrden, string> = {
  EN_PREPARACION: 'border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-100',
  ENVIADO: 'border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100',
  COMPLETADO: 'border-green-200 bg-green-100 text-green-700 hover:bg-green-100',
  CANCELADO: 'border-red-200 bg-red-100 text-red-700 hover:bg-red-100',
};

export function getEstadoBadgeClass(estado: EstadoOrden): string {
  return ESTADO_BADGE_CLASSES[estado];
}
