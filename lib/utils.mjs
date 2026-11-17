export const STATUSES = ['all','paid','pending','shipped','delivered','cancelled'];
export function validateOrder(body) {
  const customerName = String(body?.customerName ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const productId = Number(body?.productId);
  const quantity = Number(body?.quantity);
  if (customerName.length < 2 || customerName.length > 80) return 'Customer name must be 2–80 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return 'Enter a valid email.';
  if (!Number.isSafeInteger(productId) || productId < 1) return 'Select a valid product.';
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) return 'Quantity must be between 1 and 50.';
  return null;
}
export function csvEscape(value) {
  // Treat spreadsheet formula-leading cells as text when opened in Excel.
  let text = value == null ? '' : String(value);
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
export function toCsv(headers, rows) {
  return [headers.map(csvEscape).join(','), ...rows.map(row=>row.map(csvEscape).join(','))].join('\r\n') + '\r\n';
}
export function parseDays(value) { return [7,30,90].includes(Number(value)) ? Number(value) : 30; }
export function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
