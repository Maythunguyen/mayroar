
import HeroPhoto from "./HeroPhoto";
import Logo from "../ui/Logo";

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="isolate overflow-hidden bg-cream text-charcoal"
    >
      <div className="mx-auto px-6 pt-10 sm:px-8 lg:px-14 lg:pt-16">
        <div className="relative z-20 grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Introduction */}
          <div>
            <p className="text-base font-medium">
              For women who lift.
            </p>

            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-stone">
              We’re building a strength companion that connects your
              nutrition, training and recovery over time.
            </p>
          </div>

          {/* Headline and action */}
          <div>
            <h1
              id="hero-heading"
              className="text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl"
            >
              Your body has patterns.
              <br />
              Learn yours.
            </h1>

            <p className="mt-3 text-base text-stone">
              Build your strength with us.
            </p>

            <a
              href="#waitlist"
              className="
                mt-5 inline-flex min-h-12 items-center justify-center
                rounded-full bg-charcoal px-7 py-3
                text-sm font-medium text-cream
                transition-colors hover:bg-charcoal-soft
                focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-charcoal
              "
            >
              Join the waitlist
            </a>
          </div>
        </div>

        {/* Brand wordmark */}
        <div className="
          relative z-0 mt-8 flex w-full justify-center
          translate-y-2
          sm:translate-y-4
          md:translate-y-8
          lg:translate-y-12
          xl:translate-y-16
          2xl:translate-y-20
          lg:mt-10
        ">
          <Logo size="hero" priority />
        </div>
      </div>

      <HeroPhoto />
    </section>
  );
}