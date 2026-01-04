/**
 * Type definitions for the application
 * Updated with new types and features
 */

export interface User {
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  role: UserRole;
}

export interface Product {
  category: string;
  id: string;
  inStock: boolean;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  products: Product[];
  status: OrderStatus;
  total: number;
  userId: string;
}

export type UserRole = 'admin' | 'guest' | 'moderator' | 'user';

export type OrderStatus = 'delivered' | 'pending' | 'processing' | 'shipped';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  totalItems: number;
  totalPages: number;
}

export class UserRepository {
  private users: Map<string, User> = new Map();

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  findAll(): User[] {
    return [...this.users.values()];
  }

  findByEmail(email: string): undefined | User {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }

    return undefined;
  }

  findById(id: string): undefined | User {
    return this.users.get(id);
  }

  save(user: User): void {
    this.users.set(user.id, user);
  }
}

export class OrderRepository {
  private orders: Map<string, Order> = new Map();

  findById(id: string): Order | undefined {
    return this.orders.get(id);
  }

  findByUserId(userId: string): Order[] {
    return [...this.orders.values()].filter(o => o.userId === userId);
  }

  save(order: Order): void {
    this.orders.set(order.id, order);
  }
}

export function createUser(name: string, email: string, role: UserRole = 'user'): User {
  return {
    createdAt: new Date(),
    email,
    id: crypto.randomUUID(),
    name,
    role,
  };
}

export function calculateOrderTotal(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.price, 0);
}
