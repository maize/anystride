import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const coach = { id:"seller-one",email:"seller@example.test",admin:false };
const buyer = { id:"buyer-one",email:"buyer@example.test",admin:false };
const other = { id:"buyer-other",email:"other@example.test",admin:true };
const env = { MARKETPLACE_MODE:"pilot",MARKETPLACE_APP_URL:"http://localhost:3010",MARKETPLACE_DATABASE_URL:"postgresql://localhost/storefront_fixture",NEXT_PUBLIC_SUPABASE_URL:"https://example.test",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"test-only",STOREFRONT_PAYMENTS_MODE:"test",STOREFRONT_STRIPE_SECRET_KEY:"sk_test_fixture",STOREFRONT_STRIPE_PLATFORM_ACCOUNT_ID:"acct_platform",STOREFRONT_STRIPE_WEBHOOK_SECRET:"whsec_fixture",STOREFRONT_PLATFORM_FEE_BPS:"500" };
const profile = { action:"profile",slug:"demo-coach",headline:"Training that fits your life and your next goal.",location:"Online",photoUrl:"",specialties:["Marathon"],approach:"Practical, personal coaching built around your training history and available time.",published:true,version:0 };
const newOffer = () => ({ action:"offer",id:randomUUID(),version:0,title:"Race preparation package",description:"Individual coaching for runners preparing for their next race with support each week.",amount:12500,currency:"usd",durationWeeks:4,kind:"package",inclusions:["Weekly check-in","Personal training plan"],delivery:"Online training and a weekly call.",nextSteps:"Send your race date and availability to your coach to arrange your first call.",cancellation:"Contact your coach before your first session to request a refund.",available:true });

async function fixture(t) {
  const db = new PGlite();
  for (const file of ["002_marketplace.sql","006_coach_storefronts.sql","006_coach_storefronts.sql"]) await db.exec(readFileSync(new URL(`../db/migrations/${file}`,import.meta.url),"utf8"));
  t.after(() => db.close());
  await db.query("INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status) VALUES($1,'Demo Coach','This is a fictional coach for isolated storefront tests.','Example qualifications for testing only.','approved')",[coach.id]);
  class Pool { on() {} query = (sql,params) => db.query(sql,params); async connect() { return { query:this.query,release() {} }; } }
  const state = { sessions:new Map(),created:0,paid:false,refunded:0,disputed:false,ready:true,expired:false,badRecipient:false,accountsCreated:0,dashboardAccounts:[] };
  const account = { id:"acct_seller",country:"US",details_submitted:true,charges_enabled:true,payouts_enabled:true,capabilities:{transfers:"active"} };
  class Stripe {
    accounts = { createLoginLink: async (id) => { state.dashboardAccounts.push(id); return { url:"https://connect.stripe.com/express/test" }; }, retrieve: async (id) => id ? { ...account,charges_enabled:state.ready } : { id:"acct_platform",country:"US" } };
    v2 = { core: {
      accounts: { create:async (params) => {
        assert.equal(params.dashboard,"express");
        assert.equal(params.identity.country,"US");
        assert.equal(params.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested,true);
        state.accountsCreated++; return account;
      } },
      accountLinks: { create:async (params) => {
        assert.equal(params.use_case.type,"account_onboarding");
        assert.deepEqual([...params.use_case.account_onboarding.configurations],["merchant","recipient"]);
        return { url:"https://connect.stripe.com/setup/test" };
      } },
    } };
    checkout = { sessions:{
      expire:async (id) => { if (!state.sessions.has(id)) throw new Error("Unknown session"); state.expired=true; return {id,status:"expired"}; },
      create:async (params) => {
        state.created++;
        const session = { id:`cs_test_${state.created}`,livemode:false,client_reference_id:params.client_reference_id,metadata:params.metadata,amount_total:params.line_items[0].price_data.unit_amount,currency:params.line_items[0].price_data.currency,url:"https://checkout.stripe.com/c/pay/test",status:"open",payment_status:"unpaid",payment_intent:null,params };
        state.sessions.set(session.id,session); return session;
      },
      retrieve:async (id) => {
        const session = state.sessions.get(id); if (!session) throw new Error("Unknown session");
        return { ...session,status:state.expired ? "expired" : state.paid ? "complete" : "open",payment_status:state.paid ? "paid" : "unpaid",payment_intent:state.paid ? { id:`pi_${id}`,status:"succeeded",application_fee_amount:session.params.payment_intent_data.application_fee_amount,transfer_data:{destination:state.badRecipient ? "acct_wrong" : "acct_seller"},latest_charge:{id:"ch_test",paid:true,amount_refunded:state.refunded,disputed:state.disputed} } : null };
      },
    } };
    paymentIntents = { retrieve:async () => ({ metadata:{ app:"anystride_storefront",order_id:[...state.sessions.values()][0].client_reference_id } }) };
    webhooks = { constructEvent:(raw,signature) => { if (signature !== "valid") throw new Error("bad signature"); return JSON.parse(raw); } };
  }
  const mocks = { "server-only":{},pg:{Pool},stripe:{__esModule:true,default:Stripe} };
  const globals = { process:{env},Request,Response };
  const cache = new Map();
  const store = load("src/lib/storefront-store.ts",mocks,globals,cache);
  const payments = load("src/lib/storefront-payments.ts",mocks,globals,cache);
  const market = load("src/lib/marketplace-store.ts",mocks,globals,cache);
  const offer = newOffer();
  async function publish() {
    await store.saveStorefront(coach,profile);
    await store.saveStorefront(coach,offer);
    await market.actOnMarketplace(other,{action:"review",target:"service",id:offer.id,status:"approved",version:1});
    await db.query("INSERT INTO marketplace_storefront_sellers(coach_id,platform,mode,onboarding_id,stripe_account) VALUES($1,'acct_platform','test',$2,'acct_seller')",[coach.id,randomUUID()]);
  }
  return { db,store,payments,market,state,offer,publish,mocks,globals,cache };
}

test("storefront inputs reject ownership, payment and redirect injection", () => {
  const { parseStorefrontAction:parse } = load("src/lib/storefront-input.ts",{"server-only":{}});
  assert.equal(parse(profile).slug,"demo-coach");
  assert.equal(parse(newOffer()).amount,12500);
  for (const fields of [{coachId:"someone"},{status:"approved"},{stripeAccount:"acct_bad"},{checkoutUrl:"https://evil.test"}]) assert.throws(() => parse({...newOffer(),...fields}));
  for (const slug of ["../admin","Coach","a--b","a/b","%2e%2e"]) assert.throws(() => parse({...profile,slug}));
  for (const photoUrl of ["javascript:alert(1)","http://photo.test/me.jpg","https://user:pass@photo.test/me.jpg","https://127.0.0.1/me.jpg"]) assert.throws(() => parse({...profile,photoUrl}));
  assert.throws(() => parse({...newOffer(),amount:1.1}));
  assert.throws(() => parse({...profile,specialties:"not an array"}));
  const { checkoutReturnPath:safe } = load("src/lib/account-return.ts");
  const path = `/account/checkout/${randomUUID()}`;
  assert.equal(safe(path),path);
  for (const value of ["//evil.test","https://evil.test",`${path}?next=https://evil.test`,"/account/admin",null, [path]]) assert.equal(safe(value),"/account");
});

test("public profiles expose approved offers only, with no private onboarding details",async(t) => {
  const f=await fixture(t);
  await f.store.saveStorefront(coach,profile);
  await f.store.saveStorefront(coach,f.offer);
  assert.equal((await f.store.publicStorefront(profile.slug)).offers.length,0);
  await f.market.actOnMarketplace(other,{action:"review",target:"service",id:f.offer.id,status:"approved",version:1});
  const publicPage = await f.store.publicStorefront(profile.slug);
  assert.equal(publicPage.offers.length,1);
  for (const key of ["next_steps","contact_email","coach_id"]) assert.equal(key in publicPage.offers[0],false);
  assert.equal((await f.store.publicStorefronts())[0].service_ids[0],f.offer.id);
  await f.store.saveStorefront(coach,{...profile,published:false,version:1});
  assert.equal(await f.store.publicStorefront(profile.slug),null);
});

test("purchase API binds the authenticated buyer and rejects forged fields and cross-origin requests",async(t) => {
  const f=await fixture(t); await f.publish();
  const { POST }=load("src/app/api/marketplace/storefront/route.ts",{...f.mocks,"@/lib/marketplace-auth":{requireMarketplaceActor:async()=>buyer}},f.globals,f.cache);
  const id=randomUUID();
  const payload={action:"checkout",serviceId:f.offer.id,orderId:id,version:2};
  const request=(body,origin=env.MARKETPLACE_APP_URL)=>new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/storefront`,{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
  assert.equal((await POST(request(payload,"https://other.example"))).status,403);
  assert.equal((await POST(request({...payload,buyerId:other.id}))).status,400);
  const result=await POST(request(payload));
  assert.equal(result.status,200);
  assert.match(result.headers.get("cache-control"),/no-store/);
  assert.equal((await result.json()).url,"https://checkout.stripe.com/c/pay/test");
  assert.equal((await f.db.query("SELECT buyer_id FROM marketplace_storefront_orders WHERE id=$1",[id])).rows[0].buyer_id,buyer.id);
});

test("payout onboarding requires an approved coach and reuses their connected account",async(t) => {
  const f=await fixture(t);
  await assert.rejects(f.payments.startSellerOnboarding(buyer),e=>e.status===403);
  const first=await f.payments.startSellerOnboarding(coach);
  assert.equal(first.url,"https://connect.stripe.com/setup/test");
  await f.payments.startSellerOnboarding(coach);
  assert.equal(f.state.accountsCreated,1);
  assert.equal((await f.payments.storefrontSellerStatus(coach)).ready,true);
});

test("profile and offer editing enforce ownership, version checks, and re-review",async(t) => {
  const f=await fixture(t); await f.publish();
  await assert.rejects(f.store.saveStorefront(other,{...profile,version:1}),e=>e.status===403);
  await assert.rejects(f.store.saveStorefront(coach,profile),e=>e.status===409);
  await assert.rejects(f.store.saveStorefront(coach,{...profile,slug:"a-different-address",version:1}),/address stays/);
  await assert.rejects(f.store.saveStorefront(coach,{...f.offer,version:1}),/Refresh/);
  await f.store.saveStorefront(coach,{...f.offer,version:2,amount:15000});
  assert.equal((await f.store.publicStorefront(profile.slug)).offers.length,0);
  assert.equal((await f.store.ownStorefront(coach)).offers[0].status,"pending");
});

test("checkout snapshots terms and price, needs no enquiry, and reuses retries",async(t) => {
  const f=await fixture(t); await f.publish();
  const id=randomUUID();
  const result=await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  assert.equal(result.url,"https://checkout.stripe.com/c/pay/test");
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2);
  assert.equal(f.state.created,1);
  const { rows:[order] }=await f.db.query("SELECT * FROM marketplace_storefront_orders WHERE id=$1",[id]);
  assert.equal(order.amount,12500); assert.equal(order.fee,625);
  assert.equal(order.snapshot.coachName,"Demo Coach");
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_requests")).rows[0].n,0);
  const params=[...f.state.sessions.values()][0].params;
  assert.equal(params.payment_intent_data.transfer_data.destination,"acct_seller");
  assert.equal(params.success_url,`http://localhost:3010/account/orders/${id}`);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].snapshot.nextSteps,"");
  assert.equal((await f.payments.storefrontOrders(coach,id))[0].snapshot.buyerEmail,"");
});

test("unavailable, suspended, self-owned and stale offers cannot be purchased",async(t) => {
  const f=await fixture(t); await f.publish();
  await assert.rejects(f.payments.startStorefrontCheckout(coach,f.offer.id,randomUUID(),2),e=>e.status===403);
  await assert.rejects(f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),1),/offer changed/);
  f.state.ready=false;
  await assert.rejects(f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2),/cannot accept/);
  f.state.ready=true;
  await f.db.query("UPDATE marketplace_storefront_offers SET available=false WHERE service_id=$1",[f.offer.id]);
  await assert.rejects(f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2),/not currently available/);
  await f.db.query("UPDATE marketplace_storefront_offers SET available=true WHERE service_id=$1",[f.offer.id]);
  await f.db.query("UPDATE marketplace_coaches SET status='suspended' WHERE user_id=$1",[coach.id]);
  assert.equal(await f.store.publicStorefront(profile.slug),null);
  await assert.rejects(f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2),/not currently available/);
  assert.equal(f.state.created,0);
});

test("a newly approved price cannot silently reuse an older checkout",async(t) => {
  const f=await fixture(t); await f.publish();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2);
  await f.store.saveStorefront(coach,{...f.offer,version:2,amount:18000});
  await f.market.actOnMarketplace(other,{action:"review",target:"service",id:f.offer.id,status:"approved",version:3});
  await assert.rejects(f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),4),/earlier checkout/);
  assert.equal(f.state.created,1);
});

test("returning to a closed checkout reconciles it and clears the browser retry reference",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  f.state.expired=true;
  const result=await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  assert.equal(result.resetAttempt,true);
  assert.equal(result.url,`http://localhost:3010/account/orders/${id}`);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"expired");
});

test("reviewers can inspect complete offers, but ordinary accounts cannot",async(t) => {
  const f=await fixture(t); await f.publish();
  await assert.rejects(f.store.storefrontReviewOffers(coach),e=>e.status===403);
  const [offer]=await f.store.storefrontReviewOffers(other);
  assert.equal(offer.service_id,f.offer.id);
  assert.equal(offer.next_steps,f.offer.nextSteps);
  assert.equal(offer.cancellation,f.offer.cancellation);
});

test("only buyer and seller can read or reconcile an order, including against admins",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  assert.equal((await f.payments.storefrontOrders(other,id)).length,0);
  await assert.rejects(f.payments.reconcileStorefrontOrder(id,other),e=>e.status===404);
  await assert.rejects(f.payments.startStorefrontCheckout(other,f.offer.id,id,2),e=>e.status===409);
  await f.payments.reconcileStorefrontOrder(id,buyer);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"pending");
});

test("verified payment unlocks original instructions; edited offers do not rewrite orders",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  await f.store.saveStorefront(coach,{...f.offer,version:2,nextSteps:"These are different instructions for future purchases only.",amount:15000});
  f.state.paid=true;
  await f.payments.reconcileStorefrontOrder(id,buyer);
  const [order]=await f.payments.storefrontOrders(buyer,id);
  assert.equal(order.status,"paid"); assert.equal(order.amount,12500);
  assert.equal(order.snapshot.nextSteps,f.offer.nextSteps);
  assert.equal(order.snapshot.contactEmail,coach.email);
  assert.equal((await f.payments.storefrontOrders(coach,id))[0].snapshot.buyerEmail,buyer.email);
});

test("webhooks reject invalid signatures/environments and duplicate events are harmless",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  const event={id:"evt_test",type:"checkout.session.completed",livemode:false,data:{object:[...f.state.sessions.values()][0]}};
  await assert.rejects(f.payments.handleStorefrontWebhook(JSON.stringify(event),"wrong"),e=>e.status===400);
  await assert.rejects(f.payments.handleStorefrontWebhook(JSON.stringify({...event,livemode:true}),"valid"),e=>e.status===400);
  await assert.rejects(f.payments.handleStorefrontWebhook(JSON.stringify({...event,account:"acct_elsewhere"}),"valid"),e=>e.status===400);
  f.state.paid=true;
  await f.payments.handleStorefrontWebhook(JSON.stringify(event),"valid");
  await f.payments.handleStorefrontWebhook(JSON.stringify(event),"valid");
  assert.equal((await f.db.query("SELECT count(*)::int AS n FROM marketplace_storefront_events")).rows[0].n,1);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"paid");
});

test("refunds and disputes use current provider state even when old payment events arrive",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2); f.state.paid=true;
  await f.payments.reconcileStorefrontOrder(id,buyer);
  f.state.refunded=5000; await f.payments.reconcileStorefrontOrder(id,buyer);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"partially_refunded");
  f.state.refunded=12500;
  const event={id:"evt_old_paid",type:"checkout.session.completed",livemode:false,data:{object:[...f.state.sessions.values()][0]}};
  await f.payments.handleStorefrontWebhook(JSON.stringify(event),"valid");
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"refunded");
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].snapshot.contactEmail,"");
  f.state.disputed=true; await f.payments.reconcileStorefrontOrder(id,buyer);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"disputed");
});

test("mismatched recipients cannot unlock an order",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2); f.state.paid=true; f.state.badRecipient=true;
  await assert.rejects(f.payments.reconcileStorefrontOrder(id,buyer),/recipient/);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"pending");
});

test("expired sessions are reconciled and do not block a new checkout",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2); f.state.expired=true;
  await f.payments.reconcileStorefrontOrder(id,buyer);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"expired");
  f.state.expired=false;
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,randomUUID(),2);
  assert.equal(f.state.created,2);
});

test("only the buyer can close an unpaid checkout, and closure reaches the provider",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  await assert.rejects(f.payments.cancelStorefrontCheckout(id,coach),e=>e.status===404);
  await assert.rejects(f.payments.cancelStorefrontCheckout(id,other),e=>e.status===404);
  assert.equal(f.state.expired,false);
  await f.payments.cancelStorefrontCheckout(id,buyer);
  assert.equal(f.state.expired,true);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"expired");
});

test("closing a checkout that just completed records payment instead of cancelling the purchase",async(t) => {
  const f=await fixture(t); await f.publish(); const id=randomUUID();
  await f.payments.startStorefrontCheckout(buyer,f.offer.id,id,2);
  f.state.paid=true;
  await f.payments.cancelStorefrontCheckout(id,buyer);
  assert.equal(f.state.expired,false);
  assert.equal((await f.payments.storefrontOrders(buyer,id))[0].status,"paid");
});

test("payment configuration keeps test and live keys and origins separate",() => {
  for (const overrides of [{STOREFRONT_PAYMENTS_MODE:"off"},{STOREFRONT_PAYMENTS_MODE:"live"},{STOREFRONT_STRIPE_SECRET_KEY:"sk_live_fixture"},{STOREFRONT_PLATFORM_FEE_BPS:"-1"},{STOREFRONT_PLATFORM_FEE_BPS:"NaN"}]) {
    const payments=load("src/lib/storefront-payments.ts",{"server-only":{}},{process:{env:{...env,...overrides}}});
    assert.throws(()=>payments.storefrontPaymentConfig());
  }
});


test("payout dashboard is private to the authenticated seller and rejects account injection", async(t) => {
  const f=await fixture(t); await f.publish();
  await assert.rejects(f.payments.openSellerDashboard(buyer),e=>e.status===409);
  await assert.rejects(f.payments.openSellerDashboard(other),e=>e.status===409);
  const { parseStorefrontAction:parse } = load("src/lib/storefront-input.ts",{"server-only":{}});
  assert.throws(()=>parse({action:"dashboard",stripeAccount:"acct_seller"}));
  assert.equal(parse({action:"dashboard"}).action,"dashboard");
  const { POST }=load("src/app/api/marketplace/storefront/route.ts",{...f.mocks,"@/lib/marketplace-auth":{requireMarketplaceActor:async()=>coach}},f.globals,f.cache);
  const request=(origin)=>new Request(`${env.MARKETPLACE_APP_URL}/api/marketplace/storefront`,{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({action:"dashboard"})});
  assert.equal((await POST(request("https://other.example"))).status,403);
  const response=await POST(request(env.MARKETPLACE_APP_URL));
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control"),/no-store/);
  assert.equal((await response.json()).url,"https://connect.stripe.com/express/test");
  assert.deepEqual(f.state.dashboardAccounts,["acct_seller"]);
  assert.equal((await f.payments.storefrontSellerStatus(coach)).feeBps,500);
});
