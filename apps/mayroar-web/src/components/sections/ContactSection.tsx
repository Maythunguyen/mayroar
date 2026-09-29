import Image from "next/image";

export default function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="bg-cream px-6 py-12 sm:px-8 lg:px-14 lg:py-16"
    >
      <div className="relative isolate overflow-hidden rounded-[28px] bg-charcoal text-cream sm:rounded-[36px]">
        {/* Decorative pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 -z-10 size-[560px]"
        >
          <div className="absolute inset-0 rounded-full border border-cream/10" />
          <div className="absolute inset-14 rounded-full border border-cream/10" />
          <div className="absolute inset-28 rounded-full border border-cream/10" />
          <div className="absolute inset-40 rounded-full bg-[#dfff61]/5" />
        </div>

        <div className="grid gap-12 px-7 py-12 sm:px-10 sm:py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-14 lg:py-20">
          {/* Context */}
          <div className="max-w-sm">
            <span className="mb-8 block h-1 w-12 rounded-full bg-[#dfff61]" />

            <div>
                <Image
                    src="/images/white-logo-cropped-f.png"
                    alt="MayRoar"
                    width={180}
                    height={50}
                    className="mb-1 h-auto sm:w-44"
                />

                <p className="text-xl font-medium leading-snug sm:text-2xl">
                    Designed primarily for women who lift.
                </p>
            </div>

            <p className="mt-5 text-base leading-relaxed text-cream/70">
              Your cycle can be one piece of context, but we won’t
              assume it predicts how you should train.
            </p>

            <p className="mt-6 border-l-2 border-[#dfff61] pl-4 text-base font-medium">
              Your own experience matters more.
            </p>
          </div>

          {/* Headline and action */}
          <div>
            <h2
              id="contact-heading"
              className="max-w-xl text-4xl font-medium leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl"
            >
              Built around
              <br />
              <span className="text-[#dfff61]">your patterns.</span>
              <br />
              Not blanket rules.
            </h2>

            <a
              href="#approach"
              className="
                group mt-8 inline-flex min-h-14 items-center
                justify-center gap-7 rounded-full bg-[#dfff61]
                px-7 py-4 text-sm font-semibold text-charcoal
                transition-colors hover:bg-[#e8ff99]
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[#dfff61]
                motion-reduce:transition-none
              "
            >
              Read our approach

              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="
                  transition-transform
                  group-hover:-translate-y-0.5
                  group-hover:translate-x-0.5
                  motion-reduce:transform-none
                  motion-reduce:transition-none
                "
              >
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}