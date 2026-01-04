/**
 * Type definitions for the application
 */

export interface User {
  email: string;
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export type UserRole = 'admin' | 'guest' | 'user';

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export class UserRepository {
  private users: Map<string, User> = new Map();

  findById(id: string): undefined | User {
    return this.users.get(id);
  }

  save(user: User): void {
    this.users.set(user.id, user);
  }
}

export function createUser(name: string, email: string): User {
  return {
    email,
    id: crypto.randomUUID(),
    name,
  };
}
