"""Deterministic-enough synthetic data; not real customers or financial results."""
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import select, func
from .database import Base,SessionLocal,engine
from .models import Customer, Product, Order, OrderItem

PRODUCTS=[('Noise-Cancelling Headphones','Audio',4999),('Wireless Keyboard','Accessories',2799),('USB-C Hub','Accessories',1699),('Portable SSD 1TB','Storage',7499),('Desk Lamp','Home Office',1899),('Ergonomic Mouse','Accessories',2199),('Webcam HD','Video',3299),('Monitor Stand','Home Office',1999),('Laptop Sleeve','Accessories',1299),('Bluetooth Speaker','Audio',3599)]

def seed():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Customer)):
            print('Seed data already exists');return
        random.seed(27)
        customers=[Customer(name=n,email=f'customer{i}@example.test') for i,n in enumerate(['Aarav Mehta','Ananya Shah','Kabir Patel','Riya Joshi','Meera Rao','Ishaan Verma','Sara Kapoor','Dev Nair','Neha Gupta','Om Shah','Kritika Jain','Aditya Singh'],1)]
        products=[Product(name=n,category=c,price=Decimal(str(price))) for n,c,price in PRODUCTS]
        db.add_all(customers+products);db.flush()
        for i in range(225):
            order=Order(customer_id=random.choice(customers).id,status=random.choices(['paid','shipped','pending','cancelled'],weights=[47,35,12,6])[0],created_at=datetime.now(timezone.utc)-timedelta(days=random.randint(0,60),hours=random.randint(0,23)))
            db.add(order);db.flush()
            for product in random.sample(products,random.randint(1,3)):
                db.add(OrderItem(order_id=order.id,product_id=product.id,quantity=random.randint(1,3),unit_price=product.price))
        db.commit(); print('Created 225 synthetic orders')
if __name__=='__main__': seed()
