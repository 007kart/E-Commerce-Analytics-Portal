import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import { parseDays } from '../../../lib/utils.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const days = parseDays(new URL(request.url).searchParams.get('days'));
  try {
    const [metrics, trends, top, categories, status, latest] = await Promise.all([
      query(`SELECT COUNT(*)::int AS orders, COALESCE(SUM(total) FILTER(WHERE status<>'cancelled'),0) AS revenue,
          COUNT(DISTINCT customer_id)::int AS customers,
          COALESCE(AVG(total) FILTER(WHERE status<>'cancelled'),0) AS average_order
        FROM orders WHERE created_at >= NOW()-($1::int*INTERVAL '1 day')`,[days]),
      query(`SELECT TO_CHAR(d.day,'Mon DD') AS label,d.day::date::text AS date,
            COALESCE(SUM(o.total) FILTER(WHERE o.status<>'cancelled'),0) AS revenue,
            COUNT(o.id) FILTER(WHERE o.status<>'cancelled')::int AS orders
        FROM generate_series((CURRENT_DATE-($1::int-1))::date,CURRENT_DATE::date,INTERVAL '1 day') AS d(day)
        LEFT JOIN orders o ON o.created_at::date=d.day::date
        GROUP BY d.day ORDER BY d.day`,[days]),
      query(`SELECT p.name,p.category,SUM(ol.quantity)::int AS units,
            SUM(ol.quantity*ol.unit_price) AS revenue
        FROM order_lines ol JOIN products p ON ol.product_id=p.id
        JOIN orders o ON ol.order_id=o.id
        WHERE o.status<>'cancelled' AND o.created_at>=NOW()-($1::int*INTERVAL '1 day')
        GROUP BY p.id ORDER BY revenue DESC LIMIT 5`,[days]),
      query(`SELECT p.category,SUM(ol.quantity*ol.unit_price) AS revenue
        FROM order_lines ol JOIN products p ON ol.product_id=p.id JOIN orders o ON o.id=ol.order_id
        WHERE o.status<>'cancelled' AND o.created_at>=NOW()-($1::int*INTERVAL '1 day')
        GROUP BY p.category ORDER BY revenue DESC`,[days]),
      query(`SELECT status,COUNT(*)::int AS count FROM orders
        WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') GROUP BY status`,[days]),
      query(`SELECT o.id,o.status,o.total,o.created_at,c.full_name AS customer
        FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 6`)
    ]);
    return NextResponse.json({days,metrics:metrics.rows[0],trends:trends.rows,topProducts:top.rows,
      categories:categories.rows,statuses:status.rows,recent:latest.rows});
  } catch(error){console.error('Dashboard error:',error.message);return NextResponse.json({error:'Could not load analytics. Check the database connection and run npm run db:setup.'},{status:503});}
}
