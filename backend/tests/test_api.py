from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.database import Base,get_db
from app.models import Customer,Product
from app.main import app

engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
Base.metadata.create_all(bind=engine)
Session=sessionmaker(bind=engine)

def override():
    with Session() as db:yield db
app.dependency_overrides[get_db]=override
client=TestClient(app)

def test_overview_empty():
    assert client.get('/health').status_code==200
    assert client.get('/api/overview').json()['revenue']==0

def test_create_order_and_filters():
    with Session() as db:
        db.add(Customer(name='Test User',email='test@example.test'))
        db.add(Product(name='Test Item',category='Demo',price=100))
        db.commit()
    result=client.post('/api/orders',json={'customer_id':1,'items':[{'product_id':1,'quantity':2}]})
    assert result.status_code==201,result.text
    assert client.get('/api/overview').json()['revenue']==200
    assert client.get('/api/orders?search=Test').json()['total']==1
    assert client.get('/api/orders/export').status_code==200
    assert client.get('/api/top-products').json()[0]['units']==2

def test_invalid_order():
    assert client.post('/api/orders',json={'customer_id':999,'items':[{'product_id':1,'quantity':1}]}).status_code==404
    assert client.get('/api/orders?status=unknown').status_code==400
