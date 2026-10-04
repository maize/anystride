// Called only by the guarded local-marketplace script. No real coach or account.
export async function seedStorefrontDemo(pool) {
  const coachId = "storefront-fictional-demo";
  await pool.query("BEGIN");
  try {
    await pool.query(`INSERT INTO marketplace_coaches(user_id,name,bio,credentials,status)
      VALUES($1,'Morgan Ellis',$2,$3,'approved') ON CONFLICT(user_id) DO NOTHING`, [coachId,
      "A fictional coach, created to preview Anystride. This is a demo profile: its services are examples and cannot be purchased.",
      "Demo credentials only. A real coach can share their qualifications, coaching experience and sporting background here."]);
    await pool.query(`INSERT INTO marketplace_storefronts(coach_id,slug,headline,location,photo_url,specialties,approach,published)
      VALUES($1,'morgan-ellis-demo','Big goals. Real life. Room for both.','Fictional demo · Online','',$2,$3,true) ON CONFLICT(coach_id) DO NOTHING`, [coachId,
      JSON.stringify(["First marathons","Everyday runners","Sustainable progress"]),
      "The best training plan is the one that fits the person running it. We start with your story: where you are, where you want to go, and what the rest of your week looks like.\n\nFrom there, we build consistency. Honest feedback, thoughtful adjustments, and enough flexibility to keep running a part of your life you look forward to."]);
    const offers = [
      { id:"dea00001-0000-4000-8000-000000000001",title:"Find your next step",amount:6500,weeks:1,kind:"consultation",description:"A focused conversation about your running, your goals, and what to do next. Leave with a clearer direction and a few practical changes to try.",inclusions:["45-minute video consultation","Review of your recent training","Personal action notes","One follow-up email"],delivery:"One call, arranged together after purchase." },
      { id:"dea00002-0000-4000-8000-000000000002",title:"Build your running rhythm",amount:18000,weeks:4,kind:"package",description:"Four weeks of personal coaching to find a rhythm you can keep. A training plan that works around your week, with someone in your corner as life happens.",inclusions:["Personal four-week training plan","Weekly feedback and adjustments","An introductory video call","Direct email support"],delivery:"Online coaching, starting on a date we agree." },
      { id:"dea00003-0000-4000-8000-000000000003",title:"Your marathon, your way",amount:54000,weeks:12,kind:"package",description:"From the first long run to the finish line. Twelve weeks of thoughtful preparation for runners who want to arrive at their marathon feeling ready.",inclusions:["Personal twelve-week build","Weekly training reviews","Race pacing and fueling discussion","Three video check-ins"],delivery:"Twelve weeks of online support before your race." },
    ];
    for (const offer of offers) {
      await pool.query(`INSERT INTO marketplace_services(id,coach_id,title,description,amount,currency,duration_weeks,status)
        VALUES($1,$2,$3,$4,$5,'usd',$6,'approved') ON CONFLICT(id) DO NOTHING`, [offer.id,coachId,offer.title,offer.description,offer.amount,offer.weeks]);
      await pool.query(`INSERT INTO marketplace_storefront_offers(service_id,kind,inclusions,delivery,next_steps,cancellation,contact_email,available)
        VALUES($1,$2,$3,$4,$5,$6,'demo@example.invalid',true) ON CONFLICT(service_id) DO NOTHING`, [offer.id,offer.kind,JSON.stringify(offer.inclusions),offer.delivery,
        "This is a fictional local demo. A real purchase would show the coach’s instructions and contact details here.",
        "Example policy for this demo: cancel before the first session for a full refund. After coaching starts, contact the coach to discuss any unused sessions."]);
    }
    await pool.query("COMMIT");
  } catch (error) { await pool.query("ROLLBACK"); throw error; }
}
