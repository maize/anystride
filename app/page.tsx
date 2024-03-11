import { SubscribeForm } from "./components/SubscribeForm";

export default function Home() {
  return (
    <main className="w-full min-h-screen flex items-center justify-center relative isolate overflow-hidden bg-gray-900">
      <div className="mx-auto max-w-xl lg:max-w-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">anystride</h2>
        <p className="mt-4 text-lg leading-8 text-gray-300">
          Get notified about volunteering opportunities with NYRR for the 9+1 program.
        </p>
        <SubscribeForm />
      </div>
    </main>
  )
}
