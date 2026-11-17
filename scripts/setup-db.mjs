import pg from 'pg';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL first (see .env.example)'); process.exit(1); }
const client = new pg.Client({connectionString:url, ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:true}:false});
const folder = path.dirname(fileURLToPath(import.meta.url));
const rand = (()=>{let s=20261117; return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();
const CATALOG=[
['AU-001','Aural Wireless Headphones','Audio',4999,950],['AU-002','Studio ANC Earbuds','Audio',2899,920],
['DE-001','Mechanical Keyboard','Desk setup',6599,700],['DE-002','Wireless Mouse Pro','Desk setup',2499,850],
['DE-003','Laptop Stand','Desk setup',1999,760],['AC-001','Travel Tech Organizer','Accessories',1199,980],
['AC-002','USB-C 100W Charger','Accessories',3299,900],['AC-003','Braided USB-C Cable','Accessories',699,1200],
['SM-001','Minimal Desk Lamp','Home tech',2599,750],['SM-002','Smart LED Light Bar','Home tech',3699,630],
['SM-003','Portable SSD 1TB','Storage',8499,700],['SM-004','USB-C Docking Hub','Storage',4599,690]
];
const names=['Aarav Mehta','Riya Kapoor','Ishita Shah','Vihaan Patel','Ananya Joshi','Kabir Singh','Mira Verma','Dev Iyer','Aditi Rao','Neel Sharma','Priya Nair','Om Desai','Nina Shah','Arjun Das','Sanya Gupta','Ayan Jain','Tara Bose','Rohan Khanna','Pooja Sethi','Harsh Trivedi','Nidhi Sharma','Kunal Joshi','Zoya Pathak','Jay Bhatt'];
try {
 await client.connect();
 const schema=await fs.readFile(path.join(folder,'../db/schema.sql'),'utf8');
 await client.query(schema);
 const count=await client.query('SELECT COUNT(*)::int AS n FROM orders');
 if(count.rows[0].n){console.log('Tables ready. Seed skipped; existing orders preserved.');process.exit(0);}
 console.log('Creating synthetic sample customers, catalog and orders...');
 await client.query('BEGIN');
 for (let i=0;i<CATALOG.length;i++){
  const [sku,name,category,price,stock]=CATALOG[i];
  await client.query('INSERT INTO products(sku,name,category,price,stock) VALUES($1,$2,$3,$4,$5) ON CONFLICT(sku) DO NOTHING',[sku,name,category,price,stock]);
 }
 for (let i=0;i<names.length;i++){
  await client.query('INSERT INTO customers(full_name,email) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[names[i],`demo.customer${i+1}@example.com`]);
 }
 const products=(await client.query('SELECT id,price FROM products ORDER BY id')).rows;
 const customers=(await client.query('SELECT id FROM customers ORDER BY id')).rows;
 const status=['paid','paid','shipped','delivered','delivered','pending','cancelled'];
 for (let i=0;i<240;i++){
  const first=products[Math.floor(rand()*products.length)];
  const second=rand()>.5?products[Math.floor(rand()*products.length)]:null;
  const q1=1+Math.floor(rand()*3),q2=second?1+Math.floor(rand()*2):0;
  const amount=Number(first.price)*q1+(second?Number(second.price)*q2:0);
  const day=Math.floor(rand()*90), hour=Math.floor(rand()*23);
  const created=new Date(Date.now()-(day*24+hour)*3600*1000);
  const st=status[Math.floor(rand()*status.length)];
  const order=(await client.query('INSERT INTO orders(customer_id,status,total,created_at) VALUES($1,$2,$3,$4) RETURNING id',[customers[Math.floor(rand()*customers.length)].id,st,amount,created])).rows[0];
  await client.query('INSERT INTO order_lines(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.id,first.id,q1,first.price]);
  if(second) await client.query('INSERT INTO order_lines(order_id,product_id,quantity,unit_price) VALUES($1,$2,$3,$4)',[order.id,second.id,q2,second.price]);
 }
 await client.query('COMMIT');
 console.log('Seed complete: 240 orders, demo customers and products.');
} catch(error){await client.query('ROLLBACK').catch(()=>{});console.error(error);process.exitCode=1;}finally{await client.end();}
