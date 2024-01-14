import { SubscribeForm } from "./components/SubscribeForm";

export default function Home() {
  return (
    <main className="w-full min-h-screen flex items-center justify-center relative isolate overflow-hidden bg-gray-900">
      <div className="mx-auto max-w-xl lg:max-w-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">NYRR volunteering notifier</h2>
        <p className="mt-4 text-lg leading-8 text-gray-300">
          Get notified about volunteering opportunities with NYRR for the 9+1 program.
        </p>
        <SubscribeForm />
      </div>
      <div className="absolute left-1/2 top-0 bottom-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6" aria-hidden="true">
        <div
          className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#fff] to-[#000] opacity-30"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>
    </main>
  )
}
