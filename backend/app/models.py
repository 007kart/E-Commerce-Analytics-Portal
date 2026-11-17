from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, DateTime, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def now(): return datetime.now(timezone.utc)

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(150), unique=True)

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    category: Mapped[str] = mapped_column(String(60))
    price: Mapped[float] = mapped_column(Numeric(10, 2))

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey('customers.id'),index=True)
    status: Mapped[str] = mapped_column(String(25), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=now,index=True)
    customer: Mapped[Customer] = relationship()
    lines: Mapped[list['OrderItem']] = relationship(back_populates='order',cascade='all,delete-orphan')

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id'),index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Numeric(10,2))
    order: Mapped[Order] = relationship(back_populates='lines')
    product: Mapped[Product] = relationship()
