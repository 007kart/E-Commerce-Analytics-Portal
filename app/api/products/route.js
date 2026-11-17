import {NextResponse} from 'next/server';
import {query} from '../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{
 const result=await query('SELECT id,sku,name,category,price,stock FROM products ORDER BY name');
 return NextResponse.json({products:result.rows});
}catch(error){console.error(error);return NextResponse.json({error:'Products unavailable.'},{status:503});}}
