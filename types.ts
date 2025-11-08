export interface Product {
  id: string;
  name: string;
  category: string;
  priceBuy: number;
  priceSell: number;
  stock: number;
  createdAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  profit: number;
  date: number; // Timestamp
}

// For charts
export interface DailySalesData {
  date: string;
  sales: number;
  profit: number;
}
