export interface RangoMetrica {
  hoy: number;
  ultimos7Dias: number;
  ultimos30Dias: number;
}

export interface TopProducto {
  productId: string;
  nombre: string;
  marca: string;
  unidadesVendidas: number;
}

export interface DashboardMetrics {
  ventas: RangoMetrica;
  ordenes: RangoMetrica;
  clientes: {
    total: number;
    nuevosUltimos30Dias: number;
  };
  topProductos: TopProducto[];
}
