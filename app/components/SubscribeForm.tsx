"use client";

import { useState } from "react";

export const SubscribeForm = () => {
  const [ loading, setLoading ] = useState<boolean>();
  const [ subscribed, setSubcribed ] = useState<boolean>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const target = event.target as typeof event.target & {
      email: { value: string}
    };

    setLoading(true);

    fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: target.email.value,
      }),
    }).then(() => {
      setSubcribed(true);
    }).catch(() => {
      setSubcribed(false);
    }).finally(() => {
      setLoading(false);
    });
  };

  return subscribed ? (
    <div className="mt-6 flex max-w-md gap-x-4">
    <div className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm sm:text-sm sm:leading-6">
      <p className="text font-bold text-white">✅ Subscribed</p>
    </div>
    </div>
  ) : (
    <form className="mt-6 flex max-w-md gap-x-4" onSubmit={handleSubmit}>
      <label htmlFor="email-address" className="sr-only">
        Email address
      </label>
      <input
        id="email-address"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-slate-500 sm:text-sm sm:leading-6"
        placeholder="Enter your email"
      />
      <button
        type="submit"
        className="flex-none rounded-md bg-slate-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
      >
        Subscribe
      </button>
    </form>
  );
};