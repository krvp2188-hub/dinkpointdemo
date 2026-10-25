
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const courtImages = [
  '/images/court-1.jpg',
  '/images/court-2.jpg',
  '/images/court-3.jpg',
  '/images/court-4.jpg',
  '/images/court-5.jpg',
]

const steps = [
  {
    number: '01',
    icon: '▦',
    title: 'Choose a date',
    description: 'Select the day you want to play.',
    purple: false,
  },
  {
    number: '02',
    icon: '▤',
    title: 'Select a court and time',
    description: 'Pick an available court and choose your time slot.',
    purple: true,
  },
  {
    number: '03',
    icon: '✓',
    title: 'Confirm your booking',
    description: 'Enter your details and receive your confirmation.',
    purple: false,
  },
]

export default async function Home() {
  const { data: courts, error } = await supabase
    .from('courts')
    .select('*')
    .eq('status', 'available')
    .order('name')

  const availableCourts = courts ?? []

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8F5] text-[#263F34]">
      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E8EAE5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" aria-label="Drink Point home">
            <img
              src="/images/drink-point-logo.png"
              alt="Drink Point"
              className="h-12 w-auto max-w-[150px] object-contain sm:h-14"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#46544D] md:flex">
            <Link href="/" className="border-b-2 border-[#4F8067] pb-1">
              Home
            </Link>
            <Link href="#courts" className="transition hover:text-[#9676A5]">
              Our Courts
            </Link>
            <Link href="#pricing" className="transition hover:text-[#9676A5]">
              Pricing
            </Link>
            <Link href="#location" className="transition hover:text-[#9676A5]">
              Location
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#DDE5DC] px-3 py-3 text-sm font-bold text-[#263F34] transition hover:border-[#9676A5] hover:text-[#79558C] sm:px-4"
            >
              Login
            </Link>
            <Link
              href="/book"
              className="rounded-xl bg-[#D6E3A6] px-4 py-3 text-sm font-extrabold text-[#263F34] transition hover:bg-[#C5D98B] sm:px-5"
            >
              Book a Court <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="absolute inset-0 -z-20 bg-gradient-to-r from-white via-white/95 to-[#E5EDE4]" />
        <div className="absolute -left-16 bottom-0 -z-10 h-44 w-44 rounded-full bg-[#D6E3A6]/60 blur-2xl" />
        <div className="absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-[#9676A5]/20 blur-3xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9676A5] sm:text-sm">
              Drink Point Pickleball
            </p>

            <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your next game
              <span className="block text-[#9676A5]">starts here.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[#53635A] sm:text-lg">
              Book a pickleball court quickly and easily. Choose your date,
              select your court and time, and get ready to play.
            </p>

            <Link
              href="/book"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D6E3A6] px-7 py-4 font-extrabold text-[#263F34] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#C5D98B]"
            >
              Book a Court <span aria-hidden="true">→</span>
            </Link>

            <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 sm:gap-4">
              <Benefit icon="✓" text="Easy online booking" style="lime" />
              <Benefit icon="♧" text="Multiple courts" style="purple" />
              <Benefit icon="₱" text="Clear hourly rates" style="silver" />
            </div>
          </div>

          {/* Pickleball hero image */}
          <div className="relative">
            <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full bg-[#9676A5]/35 blur-2xl sm:-right-6 sm:-top-6 sm:h-40 sm:w-40" />

            <div className="relative overflow-hidden rounded-[2rem] border-4 border-white shadow-2xl">
              <img
                src="/images/hero-pickleball.jpg"
                alt="Pickleball paddles and a ball on a green and purple court"
                className="h-[300px] w-full object-cover sm:h-[400px] lg:h-[470px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#263F34]/65 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 text-white sm:bottom-7 sm:left-7 sm:right-7">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#D6E3A6]">
                    Your game awaits
                  </p>
                  <p className="mt-1 text-xl font-black sm:text-2xl">
                    Meet us on the court.
                  </p>
                </div>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#9676A5] text-2xl font-bold">
                  ↗
                </span>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-3 -z-10 h-24 w-2/3 rounded-3xl bg-[#9676A5]/35 sm:-bottom-6 sm:-left-6 sm:h-32" />
          </div>
        </div>
      </section>

      {/* Quick information */}
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-7 sm:grid-cols-3 sm:px-8 sm:py-10">
        <InfoCard
          icon="▦"
          title="Available Courts"
          value={String(availableCourts.length)}
          description="Courts ready for booking"
          iconClass="bg-[#9676A5]/25 text-[#654574]"
        />

        <InfoCard
          icon="◷"
          title="Operating Hours"
          value="6 AM – 2 AM"
          description="Check available times when booking"
          iconClass="bg-[#D6E3A6] text-[#263F34]"
        />

        <InfoCard
          icon="₱"
          title="Starting Rate"
          value="₱200"
          description="Per court, per hour"
          iconClass="bg-[#9676A5]/25 text-[#654574]"
        />
      </section>

      {/* Court gallery */}
      <section
        id="courts"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16"
      >
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9676A5] sm:text-sm">
              Our Courts
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Choose your court
            </h2>
            <p className="mt-3 text-[#66736C]">
              All courts are currently available for booking.
            </p>
          </div>

          <Link
            href="/book"
            className="font-bold text-[#9676A5] transition hover:text-[#654574]"
          >
            View all courts <span aria-hidden="true">→</span>
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
            We could not load the courts right now. Please try again later.
          </div>
        ) : availableCourts.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8E2] bg-white p-8 text-center">
            <h3 className="text-xl font-bold">No courts currently available</h3>
            <p className="mt-2 text-[#66736C]">
              Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {availableCourts.map((court, index) => (
              <article
                key={court.id}
                className="group overflow-hidden rounded-2xl border border-[#E5EAE3] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative">
                  <img
                    src={courtImages[index % courtImages.length]}
                    alt={`${court.name} pickleball court`}
                    className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-[#D6E3A6] px-3 py-1.5 text-xs font-extrabold text-[#263F34] shadow-sm">
                    Available
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-extrabold">{court.name}</h3>
                  <p className="mt-1 min-h-5 text-sm text-[#66736C]">
                    {court.description || 'Pickleball court'}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#E8EDE8] pt-4">
                    <div>
                      <p className="text-xs text-[#66736C]">Starting at</p>
                      <p className="mt-1 text-xl font-black">
                        ₱200
                        <span className="ml-1 text-xs font-medium text-[#66736C]">
                          / hour
                        </span>
                      </p>
                    </div>

                    <Link
                      href="/book"
                      className="rounded-lg bg-[#9676A5] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#79558C]"
                    >
                      Select Court
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-[#E9E1ED] bg-gradient-to-br from-[#F3ECF6] to-[#F9F7FA] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9676A5] sm:text-sm">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Book in 3 simple steps
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[#66736C]">
              A few quick steps between you and your next game.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border border-white bg-white/85 p-6 shadow-sm sm:p-7"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black ${
                      step.purple
                        ? 'bg-[#9676A5] text-white'
                        : 'bg-[#D6E3A6] text-[#263F34]'
                    }`}
                  >
                    {step.number}
                  </span>
                  <span className="text-3xl text-[#263F34]" aria-hidden="true">
                    {step.icon}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{step.title}</h3>
                <p className="mt-2 leading-6 text-[#66736C]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="mx-auto grid max-w-7xl scroll-mt-24 gap-5 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.5fr_0.85fr]"
      >
        <div className="relative overflow-hidden rounded-3xl bg-[#263F34] p-7 text-white sm:p-10">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#4F8067]/40 blur-3xl" />
          <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-[#9676A5]/40 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D6E3A6]">
              Simple Hourly Pricing
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Play more, worry less.
            </h2>
            <p className="mt-3 text-[#E1E8E2]">
              Transparent rates for a better game experience.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#B9C4C1]/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    6:00 AM – 11:59 AM
                  </p>
                  <span className="text-xl text-[#D6E3A6]" aria-hidden="true">
                    ☀
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">
                  ₱200 <span className="text-sm font-medium">/ hour</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#B9C4C1]/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    12:00 PM – 4:59 PM
                  </p>
                  <span className="text-xl text-[#D6E3A6]" aria-hidden="true">
                    ◷
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black">
                  ₱250 <span className="text-sm font-medium">/ hour</span>
                </p>
              </div>

              <div className="rounded-2xl border border-[#C5A5D4]/40 bg-[#9676A5] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    5:00 PM – 1:59 AM
                  </p>
                  <span className="text-xl" aria-hidden="true">☾</span>
                </div>
                <p className="mt-2 text-3xl font-black">
                  ₱300 <span className="text-sm font-medium">/ hour</span>
                </p>
              </div>
            </div>

            <Link
              href="/book"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D6E3A6] px-6 py-4 font-extrabold text-[#263F34] transition hover:bg-white"
            >
              Book a Court <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="relative min-h-[260px] overflow-hidden rounded-3xl bg-[#E7EDE4]">
          <img
            src="/images/court-5.jpg"
            alt="Outdoor pickleball court with green and purple playing surface"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#263F34]/80 via-[#263F34]/10 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6E3A6]">
              Make time to play
            </p>
            <h3 className="mt-2 text-2xl font-black">
              Good games start here.
            </h3>
          </div>
        </div>
      </section>

      {/* Location */}
      <section
        id="location"
        className="scroll-mt-24 border-t border-[#E5EAE3] bg-white py-14 sm:py-16"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9676A5]">
              Our Location
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Visit our courts
            </h2>
            <p className="mt-4 max-w-lg leading-7 text-[#66736C]">
              Come enjoy a game with friends at Drink Point. Check back for
              our confirmed venue location and directions.
            </p>

            <div className="mt-6 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9676A5] text-xl text-white">
                ⌖
              </span>
              <div>
                <p className="font-bold">Drink Point Pickleball</p>
                <p className="mt-1 text-sm leading-6 text-[#66736C]">
                  Prk. 4-B. Barangay Salvacion, Panabo City. In front of Fortune Philippine College of Trades and Technology Inc. 
                </p>
              </div>
            </div>
          </div>


<div className="relative min-h-[280px] overflow-hidden rounded-3xl border border-[#E5EAE3] bg-white">

<iframe
  title="Drink Point Pickleball location"
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d831.9216464269175!2d125.68599179912917!3d7.3191940222398975!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f94500327f6de5%3A0x849a9f29d589247e!2sFortune%20Philippine%20College%20of%20Trades%20and%20Technology%2C%20Inc.!5e0!3m2!1sen!2sph!4v1792967709698!5m2!1sen!2sph"
  width="100%"
  height="320"
  style={{ border: 0, minHeight: '320px' }}
  loading="lazy"
  allowFullScreen
  referrerPolicy="no-referrer-when-downgrade"
/>

  <div className="p-4">
    <a
      href="https://maps.app.goo.gl/CinzCFN4Fg7NTmPN7"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-xl bg-[#9676A5] px-5 py-3 font-bold text-white transition hover:bg-[#79558C]"
    >
      Open in Google Maps ↗
    </a>
  </div>
</div>

		  
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative overflow-hidden bg-[#263F34]">
        <div className="absolute -left-12 -top-20 h-48 w-48 rounded-full bg-[#4F8067]/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-56 w-56 rounded-full bg-[#9676A5]/40 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-10 text-center sm:px-8 md:flex-row md:text-left">
          <div>
            <img
              src="/images/drink-point-logo.png"
              alt="Drink Point"
              className="h-16 w-auto max-w-[170px] object-contain"
            />
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
              Ready to hit the court?
            </h2>
            <p className="mt-2 text-[#E1E8E2]">
              Book your pickleball game today.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D6E3A6] px-7 py-4 font-extrabold text-[#263F34] transition hover:bg-white"
          >
            Book a Court <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5EAE3] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-center sm:px-8 md:flex-row md:text-left">
          <p className="text-xs text-[#66736C]">
            © {new Date().getFullYear()} Drink Point. All rights reserved.
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-[#66736C]">
            <Link href="/" className="hover:text-[#9676A5]">Home</Link>
            <Link href="#courts" className="hover:text-[#9676A5]">Our Courts</Link>
            <Link href="#pricing" className="hover:text-[#9676A5]">Pricing</Link>
            <Link href="#location" className="hover:text-[#9676A5]">Location</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}

function Benefit({
  icon,
  text,
  style,
}: {
  icon: string
  text: string
  style: 'lime' | 'purple' | 'silver'
}) {
  const iconStyle = {
    lime: 'bg-[#D6E3A6] text-[#263F34]',
    purple: 'bg-[#9676A5] text-white',
    silver: 'bg-[#B9C4C1] text-[#263F34]',
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${iconStyle[style]}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-xs font-bold leading-5 sm:text-sm">{text}</span>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  value,
  description,
  iconClass,
}: {
  icon: string
  title: string
  value: string
  description: string
  iconClass: string
}) {
  return (
    <div className="rounded-2xl border border-[#E5EAE3] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${iconClass}`}
          aria-hidden="true"
        >
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-sm text-[#66736C]">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#66736C]">{description}</p>
        </div>
      </div>
    </div>
  )
}
