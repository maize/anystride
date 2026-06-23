export interface GuideSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  /** H1 + SEO title. */
  title: string;
  /** Meta description + list-page blurb. */
  description: string;
  /** The main search phrase this guide targets (for our own reference). */
  targetQuery: string;
  intro: string[];
  sections: GuideSection[];
  faq: GuideFaq[];
  /** Plan slugs to surface as related. */
  relatedPlans?: string[];
  /** ISO date, shown as "Updated …" and used in structured data. */
  updated: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "how-long-to-train-for-a-race",
    title: "How Long Does It Take to Train for a Race?",
    description:
      "How many weeks you need to train for a 5K, 10K, half marathon, or marathon — based on your current fitness — plus the right plan for each.",
    targetQuery: "how long to train for a marathon / half marathon / 10k / 5k",
    updated: "2026-06-14",
    intro: [
      "The honest answer is: it depends on where you're starting from. A complete beginner needs longer than someone with a running base, and the marathon asks far more than the 5K. But there are well-established ranges that work for most runners, and picking the right length keeps you fit and injury-free instead of rushed and hurt.",
      "Here's roughly how long each distance takes, who each timeline is for, and which anystride plan fits.",
    ],
    sections: [
      {
        heading: "5K: 6–9 weeks",
        body: [
          "If you can already run 20–30 minutes, you can sharpen a 5K in about 6–8 weeks. If you're starting from the couch, give yourself 9 weeks of walk/run progression to get there safely.",
        ],
        bullets: [
          "Total beginner → Couch to 5K (9 weeks)",
          "Can already jog → a focused 5K block (6–8 weeks)",
        ],
      },
      {
        heading: "10K: 8–12 weeks",
        body: [
          "A 10K builds on a 5K base. Most runners who can comfortably finish a 5K need 6–8 weeks to step up to 10K; if you're newer, plan for 10–12.",
        ],
        bullets: ["Comfortable with 5K → Bridge to 10K (6 weeks)"],
      },
      {
        heading: "Half marathon: 10–14 weeks",
        body: [
          "The half is the first distance where weekly long runs really matter. From a modest base, 12 weeks is the classic timeline — long enough to build to a 10-mile long run without overreaching.",
        ],
        bullets: [
          "First half, just finish → a 12-week novice plan",
          "Chasing a time → a 12-week intermediate plan with pace work",
        ],
      },
      {
        heading: "Marathon: 16–20 weeks",
        body: [
          "The marathon rewards patience. Sixteen to twenty weeks lets your long run climb gradually toward 20 miles and your body adapt to the volume. Going much shorter is where injuries happen.",
          "Crucially, you should already be running consistently before week 1 — most marathon plans assume a base of 15–30+ miles per week depending on the plan.",
        ],
        bullets: [
          "First marathon → an 18-week novice plan",
          "Experienced, chasing a PR → an 18-week higher-mileage plan",
        ],
      },
    ],
    faq: [
      {
        q: "Can I train for a marathon in 12 weeks?",
        a: "It's possible if you already have a solid base (you're regularly running 20+ miles a week with a long run of 10+ miles). From scratch, 12 weeks is risky — 16–20 weeks is much safer and you'll race better.",
      },
      {
        q: "How long to train for a 5K from nothing?",
        a: "About 9 weeks using a walk/run program like Couch to 5K. It alternates jogging and walking so you build fitness without the injuries that come from doing too much too soon.",
      },
      {
        q: "What if I miss a week of training?",
        a: "One missed week is fine — pick up roughly where you left off rather than cramming. If you miss several weeks, drop back a step in the plan and rebuild.",
      },
    ],
    relatedPlans: ["couch-to-5k", "bridge-to-10k", "higdon-marathon-novice-1"],
  },
  {
    slug: "training-paces-explained",
    title: "Running Training Paces Explained: Easy, Tempo, Interval",
    description:
      "What easy, marathon, threshold (tempo), interval, and rep paces mean, why they matter, and how to find your own paces from a recent race time.",
    targetQuery: "easy run pace / tempo pace / what pace should I run",
    updated: "2026-06-14",
    intro: [
      "Most runners do all their runs at the same medium effort — too hard to build endurance, too easy to build speed. Training by pace zones fixes that. Each zone trains a different system, and running them at the right effort is what turns consistent training into a faster race.",
      "Here's what each pace is for. To get your own numbers, use the anystride pace calculator — enter a recent time and it returns all of these.",
    ],
    sections: [
      {
        heading: "Easy / long pace",
        body: [
          "Conversational — you can speak in full sentences. This should be the majority of your weekly mileage, including the long run. Easy running builds the aerobic engine that every distance depends on. Most runners run their easy days too fast; slowing down is often the single biggest improvement you can make.",
        ],
      },
      {
        heading: "Marathon pace",
        body: [
          "The steady, controlled effort you'd hold for a marathon. Practising it teaches your body to burn fuel efficiently and dials in race-day rhythm. It feels comfortable early and honest late.",
        ],
      },
      {
        heading: "Threshold (tempo) pace",
        body: [
          "Comfortably hard — roughly the effort you could hold for about an hour of racing. Tempo runs raise the point at which fatigue sets in, so you can hold faster paces for longer. This is the highest-value workout for most distance runners.",
        ],
      },
      {
        heading: "Interval pace",
        body: [
          "Hard, around 3K–5K effort, run as repeats of 3–5 minutes with recovery jogs. Intervals develop your VO2max — the ceiling on your aerobic power. They hurt, but a little goes a long way.",
        ],
      },
      {
        heading: "Reps / strides",
        body: [
          "Fast and smooth, around mile effort, in short bursts. Reps sharpen turnover, running economy, and form. Even a few 15–20 second strides after an easy run pay off.",
        ],
      },
      {
        heading: "How to find your paces",
        body: [
          "Your paces come from your current fitness. Enter a recent race time (or a goal) into the anystride pace calculator and it computes your easy, marathon, threshold, interval, and rep paces, plus equivalent times at every distance. Re-check every few weeks as you get fitter.",
        ],
      },
    ],
    faq: [
      {
        q: "How fast should my easy runs be?",
        a: "Easy enough to hold a conversation — typically 1.5 to 2 minutes per mile slower than your 5K race pace. If you can't talk in sentences, you're going too fast.",
      },
      {
        q: "What is tempo pace exactly?",
        a: "Roughly the pace you could race for about an hour — for many runners that's close to their 10K-to-half-marathon pace. It should feel comfortably hard but controlled, not all-out.",
      },
      {
        q: "How do I calculate my training paces?",
        a: "Use a recent race result. The anystride pace calculator applies the same methodology coaches use (VDOT) to turn one time into all your training paces and predicted race times.",
      },
    ],
    relatedPlans: ["bridge-to-10k", "higdon-half-intermediate-1"],
  },
  {
    slug: "how-to-choose-a-training-plan",
    title: "How to Choose a Running Training Plan",
    description:
      "A simple framework for picking the right running plan by your goal, experience, weekly mileage, and time — plus how Higdon, Pfitzinger, and Hansons differ.",
    targetQuery: "which training plan should I use / Hal Higdon vs Pfitzinger",
    updated: "2026-06-14",
    intro: [
      "The best training plan is the one you'll actually finish. Picking it comes down to four questions: your goal distance, your experience, the mileage you're already running, and the time you can give each week. Get those right and the plan almost chooses itself.",
    ],
    sections: [
      {
        heading: "Start with your goal and your base",
        body: [
          "First, the distance you're training for. Second — and just as important — how much you're running now. A plan that starts above your current weekly mileage is a fast track to injury; one that starts well below it will bore you and leave fitness on the table.",
          "Not sure where you land? The pace calculator also recommends plans that match your current mileage and goal.",
        ],
      },
      {
        heading: "Match the plan to your experience",
        body: [
          "Novice plans keep volume modest and skip hard speedwork — ideal for finishing your first race. Intermediate and advanced plans add tempo runs, intervals, and higher mileage to chase a time goal. Be honest: most runners do better starting one level below their ego.",
        ],
      },
      {
        heading: "Be realistic about time",
        body: [
          "A plan peaking at 55 miles a week across six days needs 6–9 hours; a four-day novice plan needs far less. The plan you can fit into your real life beats the 'optimal' plan you'll abandon in week 5.",
        ],
      },
      {
        heading: "The popular methodologies, briefly",
        body: ["The plans runners argue about most, and who each suits:"],
        bullets: [
          "Hal Higdon — simple, flexible, beginner-friendly; great for first races.",
          "Pfitzinger ('Pfitz') — higher mileage with midweek medium-long runs; for experienced runners chasing big PRs.",
          "Hansons — high frequency and cumulative fatigue with a capped 16-mile long run; for runners who improve with consistency over single huge runs.",
          "Jack Daniels — pace-precise, VDOT-based; for runners who like training by exact numbers.",
        ],
      },
      {
        heading: "Compare side by side",
        body: [
          "Once you've narrowed it down, the anystride comparison view lines plans up by length, weekly time, intensity, and what each builds up to — so the trade-offs are easy to see.",
        ],
      },
    ],
    faq: [
      {
        q: "Hal Higdon vs Pfitzinger — which should I use?",
        a: "Higdon if you want a simple, lower-stress plan or it's an early race; Pfitzinger if you're an experienced runner with a solid mileage base chasing a personal best and you have time for higher volume.",
      },
      {
        q: "How many days a week should I run?",
        a: "Beginners do well on 3–4 days. More experienced runners chasing time goals typically run 5–6. Pick the frequency you can sustain for the whole plan, not just week one.",
      },
      {
        q: "Should I follow a plan exactly?",
        a: "Treat it as a smart default, not a contract. Shift days to fit your week, and back off if you're injured or sick. Consistency over months matters more than nailing any single session.",
      },
    ],
    relatedPlans: [
      "higdon-marathon-novice-1",
      "pfitzinger-18-55",
      "hansons-marathon-method",
    ],
  },
  {
    slug: "couch-to-5k-guide",
    title: "Couch to 5K: The Complete Free Guide",
    description:
      "What Couch to 5K is, how the 9-week walk/run plan works, tips to finish it injury-free, and what to run after your first 5K — all free, no app required.",
    targetQuery: "couch to 5k / free c25k plan",
    updated: "2026-06-14",
    intro: [
      "Couch to 5K (C25K) is the most popular way in the world to start running. It's a 9-week plan that takes a complete beginner from walking to running 5K — about 30 minutes — continuously. The secret is walk/run intervals: you alternate jogging and walking, then gradually shift the balance toward running as your body adapts.",
      "It's free, it needs no app, and it works because it builds fitness slowly enough to avoid the injuries that derail most new runners.",
    ],
    sections: [
      {
        heading: "How the plan works",
        body: [
          "You run three days a week, with rest or cross-training in between. Early weeks are mostly walking with short jogs; by the middle weeks you're running several minutes at a time; in the final weeks you run the whole session. Each run starts with a 5-minute brisk-walk warmup and ends with a walk to cool down.",
        ],
      },
      {
        heading: "Tips to actually finish it",
        body: ["Most people who quit do so for avoidable reasons. Avoid them:"],
        bullets: [
          "Go slow — 'jog' means barely faster than a walk. Speed is not the goal yet.",
          "Take the rest days. Adaptation happens when you recover, not when you run.",
          "Repeat a week if it felt too hard. There's no prize for rushing.",
          "Run by time, not distance, and on softer surfaces when you can.",
        ],
      },
      {
        heading: "What to do after Couch to 5K",
        body: [
          "Once you can run 30 minutes, you have a real aerobic base — keep it. Hold a few easy runs a week, then pick a next goal: a faster 5K, or stepping up to 10K with a bridge plan.",
        ],
      },
    ],
    faq: [
      {
        q: "Is Couch to 5K really free?",
        a: "Yes. The methodology is freely published, and the full 9-week anystride version is free to follow with no login or app — just open the plan.",
      },
      {
        q: "How many days a week is Couch to 5K?",
        a: "Three runs a week, on non-consecutive days, for nine weeks. The rest days are part of the plan — they're when your body adapts.",
      },
      {
        q: "What if I can't finish a week?",
        a: "Repeat it. It's completely normal to spend two weeks on one stage. Moving on only when a week feels manageable is exactly how to avoid injury.",
      },
      {
        q: "What comes after Couch to 5K?",
        a: "Keep running easy to hold your fitness, then choose a next goal — a quicker 5K or a step up to 10K using a bridge plan.",
      },
    ],
    relatedPlans: ["couch-to-5k", "bridge-to-10k"],
  },
  {
    slug: "fueling-for-long-runs",
    title: "How to Fuel for Long Runs",
    description:
      "When to start fueling, how much carbohydrate to take per hour, what to use, and how to practice race-day nutrition before it counts.",
    targetQuery: "fueling for long runs / what to eat during a long run",
    updated: "2026-06-15",
    intro: [
      "Your body stores roughly 90 minutes of glycogen at easy long-run pace. Once that runs out, pace drops, legs get heavy, and the remaining miles become a slog. The fix is taking in carbohydrates during the run — before you feel like you need them.",
      "Getting your fueling right in training means your race goes to plan. Getting it wrong means the wall finds you at mile 20. Here is what to take, how much, and when.",
    ],
    sections: [
      {
        heading: "When fueling starts to matter",
        body: [
          "For runs under 60 to 75 minutes, your glycogen stores are sufficient and you do not need to eat mid-run. Once you go past 75 minutes — which covers most long runs in a half-marathon or marathon plan — taking in carbohydrates will keep your energy level stable and your pace honest.",
          "The common mistake is waiting until you feel hungry or tired. By that point, glycogen is already low and catching up is slow. Start fueling at around 45 minutes into the run, before your stores dip.",
        ],
      },
      {
        heading: "How much carbohydrate per hour",
        body: [
          "The guideline most sports dietitians use is 30 to 60 grams of carbohydrate per hour of running, and up to 90 grams per hour for efforts lasting well over two hours when you mix carbohydrate types (glucose plus fructose). Most energy gels contain 20 to 25 grams, so taking one every 30 to 45 minutes falls in the right range.",
          "Your stomach also has to be trained to absorb fuel while running. Start with smaller amounts on shorter long runs and build up, exactly the way you build mileage.",
        ],
      },
      {
        heading: "What to use",
        body: [
          "Gels are the most convenient option: light, fast-absorbing, and easy to carry. Chews work similarly and suit runners who prefer something to bite into. Real food — small pieces of banana, dates, rice balls, or boiled potatoes — is a legitimate alternative and worth testing if gels upset your stomach.",
          "Sports drinks can double as hydration and carbohydrate at the same time. If you use them on the run, adjust your gel intake so you are not doubling up and overwhelming your gut.",
        ],
        bullets: [
          "Gels: 20-25 g carbs each, fast-absorbing, easy to carry",
          "Chews: similar to gels, takes a little longer to process",
          "Real food: banana, dates, rice cakes — easier on sensitive stomachs",
          "Sports drinks: combine carbs and hydration, watch total carb intake",
        ],
      },
      {
        heading: "Hydration and electrolytes",
        body: [
          "Drink to thirst on easy runs. On hot days or runs lasting more than 90 minutes, replace some of what you sweat with a drink or tablet that contains sodium and other electrolytes — plain water alone can dilute blood sodium at high volumes, which causes hyponatremia, a real race-day risk.",
          "A rough starting point: 400 to 800 ml of fluid per hour, adjusted for heat, humidity, and your own sweat rate. Finishing a long run with pale urine and no unusual swelling is a reasonable sign that hydration was close to right.",
        ],
      },
      {
        heading: "Practice fueling in training",
        body: [
          "Race day is the worst day to try something new. Use the same gels, chews, or drinks in training that you plan to use on race day. Practice the timing, test what your stomach tolerates, and find out which flavors you can keep down at mile 18.",
          "Most marathon and half-marathon plans build long runs progressively — use every long run over 75 minutes as a fueling rehearsal. If a product upsets your stomach, switch to another early enough to adapt, not in race week.",
          "Knowing your expected race time also helps you plan how many hours of fueling you will actually need. The anystride pace calculator can estimate that from a recent race or a current fitness level.",
        ],
      },
    ],
    faq: [
      {
        q: "What should I eat before a long run?",
        a: "A carbohydrate-rich meal two to three hours before works well for most runners: oatmeal, toast with banana, or rice. Keep fat and fiber low to avoid GI issues. If you run early and cannot eat first, a small snack 30 minutes before can help.",
      },
      {
        q: "Can I do long runs fasted?",
        a: "Some runners do shorter fasted runs as a training stimulus, but long runs over 90 minutes without fuel carry real risk: slower recovery, higher injury risk, and race-day habits that do not hold under pressure. Fuel your long runs.",
      },
      {
        q: "My stomach hates gels. What can I use instead?",
        a: "Real food is a legitimate alternative. Medjool dates, banana pieces, rice balls, and homemade energy balls all work. Some runners also tolerate chews or sports drinks better than gels. Experiment in training to find what you can stomach.",
      },
      {
        q: "How do I avoid hitting the wall?",
        a: "Start fueling before you feel depleted — aim for 30 to 60 grams of carbohydrate per hour starting around 45 minutes in — and run the early miles of your race conservatively. Bonking almost always comes from going out too fast, fueling too late, or both.",
      },
    ],
    relatedPlans: [
      "higdon-half-novice-1",
      "higdon-marathon-novice-1",
      "pfitzinger-18-55",
      "hansons-marathon-method",
    ],
  },
  {
    slug: "marathon-taper",
    title: "Marathon Taper: How to Reduce Training Before Race Day",
    description:
      "How to taper for a marathon — when to cut mileage, what to keep, how to beat taper madness, and why the final three weeks define your race.",
    targetQuery: "marathon taper / how to taper for a marathon",
    updated: "2026-06-15",
    intro: [
      "Three weeks before your marathon, the hard work is done. What you do now — or more precisely, what you stop doing — determines how much of that training shows up on race day. The taper is not a sign that you're slacking; it's the final phase of your preparation, and it's every bit as important as your peak long run.",
      "Here's how to taper well, why your body might feel terrible even while it's recovering, and what to focus on in those final weeks.",
    ],
    sections: [
      {
        heading: "What is a marathon taper?",
        body: [
          "A taper is the deliberate reduction of training load — mileage, intensity, or both — in the weeks before your race. It gives your body time to repair the accumulated micro-damage of months of training, top off glycogen stores, and arrive at the start line fresh rather than depleted.",
          "Almost every marathon plan includes one. Higdon Novice 1 drops mileage steadily over three weeks with a 12-mile long run two weeks out. Pfitzinger cuts volume sharply in the final two weeks while preserving some quality work. Hansons, which uses cumulative fatigue as a training tool, also tapers — but keeps frequency high right up to the end. The structure differs; the principle is the same.",
        ],
      },
      {
        heading: "How long should the taper be?",
        body: [
          "For most marathon runners, two to three weeks is the standard. Here's how those weeks typically break down:",
        ],
        bullets: [
          "Three weeks out: reduce total mileage by about 20-25%. Keep one quality session at marathon pace or slightly faster.",
          "Two weeks out: drop to roughly 60% of peak mileage. Runs are shorter but still purposeful — don't slow down just because the distances are easier.",
          "Race week: mostly short easy runs of 20-30 minutes to stay loose. A few brief pickups at goal race pace keep the legs feeling sharp without digging into recovery.",
        ],
      },
      {
        heading: "What to keep doing during the taper",
        body: [
          "The most common taper mistake is stopping everything. You trained your body to run — a total shutdown leaves you flat and stiff on race day. Keep these things in place:",
        ],
        bullets: [
          "Frequency: keep running most days, even if the runs are very short. Stopping entirely makes race morning feel like a shock.",
          "Some intensity: one session at goal marathon pace in the penultimate week maintains the neuromuscular feel of racing effort.",
          "Sleep: this is when your body does most of its repair. Prioritize it more than any workout.",
          "Nutrition: in the final two or three days, shift calories toward carbohydrates to top off glycogen. Familiar foods only.",
        ],
      },
      {
        heading: "Taper madness: what it is and why it happens",
        body: [
          "Taper madness is the unofficial name for the anxiety, restlessness, phantom soreness, and creeping self-doubt that hits most runners in the taper. Your legs ache for no obvious reason. You feel slow. You convince yourself you've forgotten how to run or that you're coming down with something.",
          "This is completely normal and has a physiological explanation: your body is doing significant repair work, your adrenaline has nowhere productive to go, and the drop in training volume leaves more mental space to worry. The feelings are not evidence that something is wrong — they're a sign that training worked and your body is finishing the job.",
          "The fix is discipline: trust the taper, resist the urge to add miles to reassure yourself, and find ways to occupy the extra time that don't involve running.",
        ],
      },
      {
        heading: "What not to do in the final weeks",
        body: [
          "A few common mistakes that cost runners on race day:",
        ],
        bullets: [
          "Don't add a last big long run to reassure yourself. You can't meaningfully build fitness in the final two weeks, but you can dig a recovery hole you won't climb out of in time.",
          "Don't try new gear, new nutrition, or new routes. Anything unfamiliar is an uncontrolled variable with no upside.",
          "Don't stand on your feet sightseeing in your race city the day before. Your legs are your race-day asset.",
          "Don't panic if the scale moves up a pound or two. Glycogen storage brings water weight with it. That extra weight is fuel, not fat.",
        ],
      },
      {
        heading: "Race week specifics",
        body: [
          "Keep runs easy and short — 20 to 30 minutes at most. A gentle shakeout the day before the race or two days out helps prevent stiff legs without adding fatigue. Focus on sleep, hydration, and foods you know agree with your stomach.",
          "Use the anystride pace calculator before race week to lock in your goal pace per mile. Know exactly how the first few miles should feel — going out 15 seconds per mile too fast in the opening 10K is the most reliable path to hitting the wall near mile 20. The taper builds the engine; smart pacing drives it home.",
        ],
      },
    ],
    faq: [
      {
        q: "How much should I cut mileage during the marathon taper?",
        a: "A common structure: down to about 75-80% of peak in the third week out, 60% in the second week, and 30-40% in race week. Follow what your specific plan prescribes rather than improvising — the taper is built into the plan's logic.",
      },
      {
        q: "Should I still do speedwork during the taper?",
        a: "Yes, but scaled back. One session at marathon pace or slightly faster in the penultimate week keeps the legs sharp. In race week, a few short pickups — 4 to 6 times 30 seconds at race pace during an easy run — is plenty.",
      },
      {
        q: "Why do I feel terrible and slow during the taper?",
        a: "Taper madness is nearly universal. Phantom soreness, low energy, and anxiety are all normal because your body is repairing itself and your nervous system misses its routine. The feelings are a sign training worked, not that something is wrong.",
      },
      {
        q: "What should I eat during the marathon taper?",
        a: "Eat normally for most of the taper. In the final two or three days, shift toward carbohydrate-heavy meals — rice, pasta, bread, potatoes — to fill glycogen stores. Avoid anything new or unusual that might upset your stomach on race day.",
      },
      {
        q: "Can I ruin my marathon with a bad taper?",
        a: "A genuinely bad taper — a long hard run 10 days out, or two complete weeks of doing nothing — can cost you significantly. But a slightly imperfect taper rarely does much damage. The biggest risk is overthinking it: follow the plan, trust the process, and show up rested.",
      },
    ],
    relatedPlans: [
      "higdon-marathon-novice-1",
      "pfitzinger-18-55",
      "hansons-marathon-method",
    ],
  },
  {
    slug: "fueling-long-runs",
    title: "Fueling Long Runs: What to Eat and Drink on the Road",
    description:
      "What to eat before, during, and after long runs — how many carbs, fluids, and electrolytes you need, and a simple race-ready fueling strategy.",
    targetQuery: "fueling for long runs / what to eat on a long run",
    updated: "2026-06-15",
    intro: [
      "Your body carries enough glycogen — the stored form of carbohydrate — for roughly 90 to 120 minutes of running. Once those stores run low, pace collapses, every step feels harder than it should, and you get a firsthand introduction to hitting the wall. Fueling is simply the strategy for keeping those stores topped off long enough to finish well.",
      "Most runners underestimate how much they need and start practicing too late. Getting your nutrition dialed in during training — not experimenting for the first time on race day — is one of the clearest performance gains available to any long-distance runner.",
    ],
    sections: [
      {
        heading: "The glycogen problem",
        body: [
          "Your muscles and liver store carbohydrate as glycogen — roughly 400 to 500 grams in a well-fed runner, equivalent to about 1,600 to 2,000 calories. At easy pace your body burns a mix of fat and carbohydrate, so glycogen lasts longer. As pace rises or the run extends beyond 90 minutes, you draw more heavily on those stores. When they run out, fat alone cannot fuel the intensity you need, and pace drops sharply.",
          "The practical upshot: for any run lasting longer than 75 to 90 minutes, what you eat before and during the run matters as much as your fitness.",
        ],
      },
      {
        heading: "Before the run: fueling 2 to 3 hours out",
        body: [
          "Eat a carbohydrate-centered meal two to three hours before your long run. Oatmeal with banana, toast with peanut butter and jam, or rice with a little protein all work well. Keep fat and fiber modest — both slow gastric emptying and can cause problems when your gut is being jostled at running pace.",
          "If your schedule means you run early and can't eat a full meal, a small easily-digestible snack — half a banana, a gel, or a slice of toast — 30 to 45 minutes before you head out is far better than nothing. You're just trying to top off the overnight glycogen drop before a hard effort.",
        ],
      },
      {
        heading: "During the run: carbohydrate and timing",
        body: [
          "Start taking carbohydrate before you feel hungry or tired — roughly 45 to 60 minutes into the run. If you wait until you feel depleted, your glycogen is already low and restoring pace takes time. Early, consistent intake is far more effective than catching up.",
          "Aim for 30 to 60 grams of carbohydrate per hour. More experienced runners with trained guts can push 60 to 90 grams per hour by combining glucose and fructose sources, which use different intestinal transporters and clear the gut faster. Start at the lower end and build up across several training runs.",
        ],
        bullets: [
          "Gels: 20 to 25g of carbohydrate each; easiest to carry and absorb quickly.",
          "Chews: similar carbohydrate content; some runners tolerate the texture better than gels.",
          "Sports drinks: carbohydrate and sodium together; convenient on courses with aid stations.",
          "Real food: bananas, dates, and rice cakes all work; useful if you struggle with engineered products.",
        ],
      },
      {
        heading: "Hydration: water and sodium",
        body: [
          "Drink to thirst rather than on a rigid schedule — research consistently shows this matches intake to actual need better than prescribed volumes. Plain water is fine for runs under 60 to 75 minutes. On longer efforts, you also need sodium to replace what you lose in sweat. Without it, drinking large amounts of plain water can dilute blood sodium and cause hyponatremia — rare but serious.",
          "A sports drink, electrolyte tab dissolved in water, or a salty snack alongside plain water all provide the sodium you need. How much you sweat varies enormously by individual, intensity, and temperature — if you finish long runs severely thirsty or with visible white salt marks on your kit, you probably need more.",
        ],
      },
      {
        heading: "After the run: the recovery window",
        body: [
          "After a depleting long run, eating carbohydrate and protein within 30 to 45 minutes helps kickstart glycogen replenishment and muscle repair. This recovery window matters most after long or high-intensity efforts when stores are significantly drawn down — it's less critical after an easy 45-minute jog.",
          "You don't need a special product: chocolate milk, a bowl of rice with eggs, or yogurt with fruit all hit the right macros. What matters is eating something rather than skipping the meal and getting to it faster than you otherwise would.",
        ],
      },
      {
        heading: "Practice everything in training — never on race day",
        body: [
          "Your gut is trainable. Taking carbohydrates while running can cause nausea at first, especially at intensity, but consistent practice in training desensitizes the stomach over several weeks. Use the long runs in your plan — whether that is Higdon Novice 1 building toward 20 miles, Pfitzinger 18/55 with its stacked midweek volume, or the Hansons cumulative-load approach — to rehearse your exact race-day nutrition.",
          "Know the gels and drinks available on your race course and train with them specifically. Race day is never the time to discover your stomach disagrees with a new brand. Use the anystride pace calculator to lock in your goal pace before race week, then plan how many aid stations you will hit and whether to carry your own fuel or rely on the course. The combination of practiced nutrition and a smart first-mile pace is what keeps the wall from appearing at mile 20.",
        ],
      },
    ],
    faq: [
      {
        q: "When should I start taking gels on a long run?",
        a: "Around 45 to 60 minutes in — before you feel depleted. If you wait until you feel hungry or tired, glycogen is already low and recovery is slow. Early, consistent intake beats catching up.",
      },
      {
        q: "How many gels do I need for a marathon?",
        a: "A typical gel provides 20 to 25 grams of carbohydrate. At 30 to 60 grams per hour, a 4-hour marathon might require 6 to 10 gels depending on how much carbohydrate you get from course drinks. Work it out based on your expected finish time and available aid stations.",
      },
      {
        q: "What if I can't stomach gels during a run?",
        a: "Your gut can adapt with practice. Start with small amounts early in the run before intensity rises, and repeat consistently across training weeks. Some runners do better with chews, dates, bananas, or sports drinks than with gels — all deliver carbohydrate and all work.",
      },
      {
        q: "Do I need to eat on runs under an hour?",
        a: "No. For runs up to about 75 minutes at easy pace you have enough glycogen to work with. Stay hydrated, but mid-run carbohydrates are not necessary unless you started the day significantly underfueled.",
      },
      {
        q: "What should I eat the night before a long run?",
        a: "A carbohydrate-centered dinner — pasta, rice, bread, potatoes — that you know agrees with your digestion. Nothing rich, fatty, or unfamiliar. The goal is to go to bed with full glycogen stores so you start the next morning well-stocked.",
      },
    ],
    relatedPlans: [
      "higdon-marathon-novice-1",
      "pfitzinger-18-55",
      "hansons-marathon-method",
    ],
  },
];
