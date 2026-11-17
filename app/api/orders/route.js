import { NextResponse } from 'next/server';
import { getPool, query } from '../../../lib/db';
import { STATUSES, validateOrder } from '../../../lib/utils.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request){
  const params=new URL(request.url).searchParams;
  const status=STATUSES.includes(params.get('status'))?params.get('status'):'all';
  const search=(params.get('search')||'').slice(0,120).trim();
  const page=Math.min(500,Math.max(1,parseInt(params.get('page'),10)||1));
  const limit=10;
  try {
    const where=`WHERE ($1::text='all' OR o.status=$1) AND ($2::text='' OR c.full_name ILIKE '%'||$2||'%' OR c.email ILIKE '%'||$2||'%' OR o.id::text=$2)`;
    const [count,orders]=await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM orders o JOIN customers c ON c.id=o.customer_id ${where}`,[status,search]),
      query(`SELECT o.id,o.status,o.total,o.created_at,c.full_name AS customer,c.email,
          COALESCE((SELECT SUM(quantity)::int FROM order_lines WHERE order_id=o.id),0) AS units
        FROM orders o JOIN customers c ON c.id=o.customer_id ${where}
        ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`,[status,search,limit,(page-1)*limit])
    ]);
    return NextResponse.json({orders:orders.rows,total:count.rows[0].count,page,pages:Math.max(1,Math.ceil(count.rows[0].count/limit))});
  } catch(error){console.error(error);return NextResponse.json({error:'Unable to load orders.'},{status:503});}
}

export async function POST(request){
  let body;
  try{body=await request.json();}catch{return NextResponse.json({error:'Invalid JSON body.'},{status:400});}
  const validation=validateOrder(body);
  if(validation)return NextResponse.json({error:validation},{status:400});
  const customerName=body.customerName.trim(),email=body.email.trim().toLowerCase();
  const productId=Number(body.productId),quantity=Number(body.quantity);
  const client=await getPool().connect();
  try{
    await client.query('BEGIN');
    const product=(await client.query('SELECT id,price,stock FROM products WHERE id=$1 FOR UPDATE',[productId])).rows[0];
    if(!product){await client.query('ROLLBACK');return NextResponse.json({error:'Product not found.'},{status:404});}
    if(product.stock<quantity){await client.query('ROLLBACK');return NextResponse.json({error:`Only ${product.stock} units available.`},{status:409});}
    const customer=(await client.query(`INSERT INTO customers(full_name,email) VALUES($1,$2)
      ON CONFLICT(email) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id`,[customerName,email])).rows[0];
    const total=(Number(product.price)*quantity).toFixed(2);
    const order=(await client.query(`INSERT INTO orders(customer_id,status,total)
      VALUES($1,'paid',$2) RETURNING id`,[customer.id,total])).rows[0];
    await client.query('INSERT INTO order_lines(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.id,productId,quantity,product.price]);
    await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[quantity,productId]);
    await client.query('COMMIT');
    return NextResponse.json({id:order.id,orderTotal:total,message:'Demo order created.'},{status:201});
  }catch(error){await client.query('ROLLBACK').catch(()=>{});console.error(error);return NextResponse.json({error:'Could not create order.'},{status:503});}
  finally{client.release();}
}
