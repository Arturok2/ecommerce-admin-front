export const GENERO_OPTIONS = ['MASCULINO', 'FEMENINO', 'UNISEX', 'NINOS'] as const;
export type Genero = (typeof GENERO_OPTIONS)[number];

export type EstadoProducto = 'ACTIVO' | 'INACTIVO';

export interface VariantAttribute {
  id: string;
  tipo: string;
  valor: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  precio: string; // Prisma Decimal serializa como string en el JSON de respuesta
  stock: number;
  atributos: VariantAttribute[];
}

export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  genero: Genero;
  marca: string;
  imagenes: string[];
  estado: EstadoProducto;
  categoriaId: string;
  categoria: { id: string; nombre: string };
  variantes: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
