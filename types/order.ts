// Order-specific TypeScript types

import type { OrderStatus, PaymentStatus, MeshDimensions } from "./index";

// ─── API Payloads ─────────────────────────────────────────────

/** POST /api/orders  —  request body */
export interface CreateOrderPayload {
  customText: string;
  styleId: string;
  colorId: string;        // Text Color
  baseColorId?: string;   // Key Contour Backplate Color
  fontStyle?: string;     // Font Style ID (e.g. "helvetiker_bold")
  material?: string;      // "PLA" | "TPU"
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
}

/** PATCH /api/orders/[id]  —  request body */
export interface UpdateOrderPayload {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

// ─── Response shapes ──────────────────────────────────────────

export interface OrderItemResponse {
  id: string;
  customText: string;
  fontStyle: string;
  material: string | null;
  quantity: number;
  unitPrice: number;
  stlFileUrl: string | null;
  dimensions: MeshDimensions | null;
  style: { id: string; name: string; fontFamily: string };
  color: { id: string; name: string; hexCode: string };
  baseColor: { id: string; name: string; hexCode: string } | null;
}

export interface OrderResponse {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string;
  totalPrice: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItemResponse[];
}
