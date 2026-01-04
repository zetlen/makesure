"""
Data models for the application.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class User:
    id: str
    name: str
    email: str


@dataclass
class Product:
    id: str
    name: str
    price: float


class UserRepository:
    def __init__(self):
        self._users = {}

    def find_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def save(self, user: User) -> None:
        self._users[user.id] = user


def create_user(name: str, email: str) -> User:
    import uuid
    return User(
        id=str(uuid.uuid4()),
        name=name,
        email=email,
    )


def format_price(price: float) -> str:
    return f"${price:.2f}"
