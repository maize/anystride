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
];
