"""Order analytics API — sample data only. No real payment integration."""
import csv
import io
import os
from datetime import datetime, timedelta, timezone, date
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, distinct
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel, Field
from .database import Base, engine, get_db
from .models import Customer, Product, Order, OrderItem

Base.metadata.create_all(bind=engine)
app = FastAPI(title='E-Commerce Analytics API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv('FRONTEND_ORIGIN','http://localhost:3000')], allow_methods=['GET','POST'], allow_headers=['*'])

class ItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=100)
class OrderIn(BaseModel):
    customer_id: int
    items: list[ItemIn] = Field(min_length=1)

@app.get('/health')
def health(): return {'status':'ok'}

@app.get('/api/overview')
def overview(days: int = Query(30,ge=1,le=365), db: Session = Depends(get_db)):
    start = datetime.now(timezone.utc) - timedelta(days=days)
    base = (select(Order.id, Order.customer_id, func.coalesce(func.sum(OrderItem.quantity * OrderItem.unit_price),0).label('value'))
            .join(OrderItem, OrderItem.order_id==Order.id).where(Order.created_at>=start, Order.status!='cancelled')
            .group_by(Order.id,Order.customer_id))
    rows = db.execute(base).all()
    revenue = round(sum(float(r.value) for r in rows),2)
    return {'revenue':revenue,'orders':len(rows),'customers':len({r.customer_id for r in rows}),
            'average_order_value':round(revenue/len(rows),2) if rows else 0,
            'total_products':db.scalar(select(func.count()).select_from(Product)) or 0}

@app.get('/api/trends')
def trends(days: int = Query(30,ge=1,le=365), db: Session = Depends(get_db)):
    start=(datetime.now(timezone.utc)-timedelta(days=days)).date()
    q=(select(func.date(Order.created_at).label('day'),func.sum(OrderItem.quantity * OrderItem.unit_price).label('revenue'),func.count(distinct(Order.id)).label('orders'))
       .join(OrderItem,OrderItem.order_id==Order.id).where(func.date(Order.created_at)>=str(start), Order.status!='cancelled')
       .group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at)))
    return [{'day':str(r.day),'revenue':round(float(r.revenue),2),'orders':r.orders} for r in db.execute(q)]

@app.get('/api/top-products')
def top_products(days: int = Query(30,ge=1,le=365),db: Session = Depends(get_db)):
    start=datetime.now(timezone.utc)-timedelta(days=days)
    q=(select(Product.name,Product.category,func.sum(OrderItem.quantity).label('units'),func.sum(OrderItem.quantity*OrderItem.unit_price).label('revenue'))
      .join(OrderItem,OrderItem.product_id==Product.id).join(Order,Order.id==OrderItem.order_id)
      .where(Order.created_at>=start,Order.status!='cancelled').group_by(Product.id,Product.name,Product.category)
      .order_by(func.sum(OrderItem.quantity*OrderItem.unit_price).desc()).limit(8))
    return [{'name':r.name,'category':r.category,'units':r.units,'revenue':round(float(r.revenue),2)} for r in db.execute(q)]

def _order_rows(db: Session, status: str | None, search: str):
    orders=db.scalars(select(Order).options(selectinload(Order.lines),selectinload(Order.customer))
                      .join(Customer).where((Order.status==status) if status else True)
                      .where(Customer.name.ilike(f'%{search}%') if search else True)
                      .order_by(Order.created_at.desc())).all()
    return [{'id':o.id,'date':o.created_at.date().isoformat(),'customer':o.customer.name,'status':o.status,
             'items':sum(i.quantity for i in o.lines),'total':round(sum(float(i.unit_price)*i.quantity for i in o.lines),2)} for o in orders]

@app.get('/api/orders')
def orders(status: str | None = None,search: str='',page:int=Query(1,ge=1),page_size:int=Query(12,ge=1,le=100), db:Session=Depends(get_db)):
    if status and status not in {'paid','pending','shipped','cancelled'}: raise HTTPException(400,'Invalid status')
    rows=_order_rows(db,status,search[:80])
    return {'total':len(rows),'page':page,'items':rows[(page-1)*page_size:page*page_size]}

@app.get('/api/orders/export')
def export_orders(status: str | None = None,db: Session=Depends(get_db)):
    if status and status not in {'paid','pending','shipped','cancelled'}: raise HTTPException(400,'Invalid status')
    stream=io.StringIO(); w=csv.DictWriter(stream,fieldnames=['id','date','customer','status','items','total']);w.writeheader();w.writerows(_order_rows(db,status,''))
    return StreamingResponse(iter([stream.getvalue()]),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="orders.csv"'})

@app.post('/api/orders',status_code=201)
def create_order(payload:OrderIn,db:Session=Depends(get_db)):
    if db.get(Customer,payload.customer_id) is None:raise HTTPException(404,'Customer not found')
    ids=[p.product_id for p in payload.items]; products={p.id:p for p in db.scalars(select(Product).where(Product.id.in_(ids)))}
    if len(products)!=len(set(ids)):raise HTTPException(404,'One or more products missing')
    order=Order(customer_id=payload.customer_id,status='paid');db.add(order);db.flush()
    for line in payload.items:
        db.add(OrderItem(order_id=order.id, product_id=line.product_id,quantity=line.quantity, unit_price=products[line.product_id].price))
    db.commit();return {'id':order.id,'status':'paid'}
