"use client";

import Image from "next/image";
import { useState } from "react";

export function CoachPortrait({ name, src = "", compact = false }: { name: string; src?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  return <div className={`coach-portrait relative isolate overflow-hidden bg-muted ${compact ? "aspect-square w-20 rounded-xl" : "aspect-[4/5] w-full rounded-2xl"}`}>
    {src && !failed ? <Image src={src} alt={name} fill unoptimized referrerPolicy="no-referrer" sizes={compact ? "80px" : "(max-width: 768px) 80vw, 400px"} className="object-cover" onError={() => setFailed(true)} /> : <>
      <div aria-hidden="true" className="coach-track" />
      <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-center font-semibold tracking-tighter text-brand ${compact ? "text-3xl" : "text-8xl sm:text-9xl"}`}>{initials}</span>
      {!compact && <p className="absolute bottom-6 left-6 text-xs font-semibold tracking-widest text-muted-foreground">YOUR NEXT CHAPTER, TOGETHER.</p>}
    </>}
  </div>;
}
