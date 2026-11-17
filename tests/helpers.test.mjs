import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrder,toCsv,parseDays} from '../lib/utils.mjs';
test('order validation enforces required fields and quantity',()=>{
 const ok={customerName:'Demo Buyer',email:'demo@example.com',productId:2,quantity:3};
 assert.equal(validateOrder(ok),null);
 assert.match(validateOrder({...ok,quantity:0}),/Quantity/);
 assert.match(validateOrder({...ok,email:'bad'}),/email/);
 assert.match(validateOrder({...ok,productId:'x'}),/product/);
});
test('csv protects quotes, newlines, and formula injection',()=>{
 const text=toCsv(['Customer'],[['A "quoted" buyer'],['=HYPERLINK("foo")']]);
 assert.match(text,/"A ""quoted"" buyer"/);
 assert.match(text,/"'=HYPERLINK/);
});
test('dashboard range is bounded',()=>{
 assert.equal(parseDays('7'),7);assert.equal(parseDays('999999'),30);assert.equal(parseDays(null),30);
});
