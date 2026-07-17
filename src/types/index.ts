import { UserRole, PaymentStatus, OrderStatus } from "@prisma/client";
export { UserRole, PaymentStatus, OrderStatus };

// export enum UserRole {
//   Customer = "customer",
//   Admin    = "admin",
// }

export enum ProductCategory {
  Electronics = "Electronics",
  Footwear    = "Footwear",
  Bags        = "Bags",
  Clothing    = "Clothing",
  Sports      = "Sports",
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  rating: number;
  inStock: boolean;
  stock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export interface IOrder {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentReference: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingAddress: ShippingAddress;
  paidAt?: Date;
  createdAt: Date;
}

export interface IPasswordReset {
  email: string;
  otpHash: string;
  resetToken: string;
  expiresAt: Date;
  used: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductQueryParams {
  category?: string;
  search?: string;
  sort?: "low-to-high" | "high-to-low" | "top-rated";
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface InitiatePaymentBody {
  email: string;
  amount: number;
  orderId: string;
  metadata: {
    items: Array<{
      id: string;
      name: string;
      qty: number;
      price?: number;
      image?: string;
    }>;
    shippingAddress: ShippingAddress;
  };
}

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyData {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number;
  paid_at: string;
  customer: { email: string };
}

export type MongoId = string;
export type EmailOptions = { to: string; subject: string; html: string };
export type SortOrder  = Record<string, 1 | -1>;
export type FilterQuery = Record<string, unknown>;