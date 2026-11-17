import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { toCsv } from '../../../../lib/utils.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const r=await query(`SELECT o.id,c.full_name,c.email,o.status,o.total,o.created_at
    FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 10000`);
  const csv=toCsv(['Order ID','Customer','Email','Status','Total INR','Created At'],
    r.rows.map(o=>[o.id,o.full_name,o.email,o.status,o.total,new Date(o.created_at).toISOString()]));
  return new NextResponse(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="commerce-orders.csv"','cache-control':'no-store'}});
 }catch(error){console.error(error);return NextResponse.json({error:'Export unavailable.'},{status:503});}
}
