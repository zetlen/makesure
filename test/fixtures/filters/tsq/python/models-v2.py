"""
Data models for the application.
Updated with new features and models.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional


class UserRole(Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"


class OrderStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"


@dataclass
class User:
    id: str
    name: str
    email: str
    role: UserRole = UserRole.USER
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Product:
    id: str
    name: str
    price: float
    category: str = ""
    in_stock: bool = True


@dataclass
class Order:
    id: str
    user_id: str
    products: List[Product] = field(default_factory=list)
    status: OrderStatus = OrderStatus.PENDING


class UserRepository:
    def __init__(self):
        self._users = {}

    def find_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def find_by_email(self, email: str) -> Optional[User]:
        for user in self._users.values():
            if user.email == email:
                return user
        return None

    def save(self, user: User) -> None:
        self._users[user.id] = user

    def delete(self, user_id: str) -> bool:
        if user_id in self._users:
            del self._users[user_id]
            return True
        return False

    def find_all(self) -> List[User]:
        return list(self._users.values())


class OrderRepository:
    def __init__(self):
        self._orders = {}

    def find_by_id(self, order_id: str) -> Optional[Order]:
        return self._orders.get(order_id)

    def find_by_user_id(self, user_id: str) -> List[Order]:
        return [o for o in self._orders.values() if o.user_id == user_id]

    def save(self, order: Order) -> None:
        self._orders[order.id] = order


def create_user(name: str, email: str, role: UserRole = UserRole.USER) -> User:
    import uuid
    return User(
        id=str(uuid.uuid4()),
        name=name,
        email=email,
        role=role,
    )


def format_price(price: float, currency: str = "USD") -> str:
    symbols = {"USD": "$", "EUR": "€", "GBP": "£"}
    symbol = symbols.get(currency, "$")
    return f"{symbol}{price:.2f}"


def calculate_order_total(products: List[Product]) -> float:
    return sum(p.price for p in products)


def validate_email(email: str) -> bool:
    import re
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return bool(re.match(pattern, email))
