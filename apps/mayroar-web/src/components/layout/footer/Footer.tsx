import Image from "next/image";
type FooterLink = { label: string; href: string };

type FooterProps = {
  /** A real endpoint that accepts a POST with an `email` field. */
  waitlistAction?: string;
  /** Supply only published profiles and pages. */
  socialLinks?: FooterLink[];
  legalLinks?: FooterLink[];
  contactEmail?: string;
};

const linkClass =
  "rounded-sm text-sm leading-relaxed text-charcoal transition-colors hover:text-stone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal motion-reduce:transition-none";

export default function Footer({
  waitlistAction,
  socialLinks = [],
  legalLinks = [],
  contactEmail,
}: FooterProps) {
  return (
    <footer className="bg-cream text-charcoal">
      <div className="mx-auto w-full max-w-[1900px] px-6 pb-8 pt-20 sm:px-8 sm:pt-24 lg:pt-32 lg:px-14">
        <div className="grid gap-14 lg:grid-cols-[1.25fr_1.5fr] lg:gap-20 xl:gap-32">
          <div className="max-w-lg">
            <a
            href="#"
            aria-label="MayRoar — back to top"
            className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
            >
            <Image
                src="/images/mayroar-logo-light-crop.png"
                alt="MayRoar"
                width={1000}
                height={1000}
                className="h-24 w-auto bg-transparent"
            />
            </a>

            <p className="mt-6 text-sm leading-relaxed text-stone">
              <span className="text-charcoal">Your strength has a story.</span>{" "}
              We’re building tools to help you understand it, one meal,
              one session and one pattern at a time.
            </p>

            {waitlistAction ? (
              <form action={waitlistAction} method="post" className="mt-6">
                <label htmlFor="footer-email" className="sr-only">Your email address</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="footer-email" name="email" type="email" autoComplete="email" required placeholder="Your email" className="min-w-0 flex-1 rounded-full border border-line bg-transparent px-5 py-3 text-base text-charcoal placeholder:text-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal" />
                  <button type="submit" className="shrink-0 rounded-full bg-charcoal px-6 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal motion-reduce:transition-none">Keep me updated</button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone">Sign up for MayRoar product news and early access updates.</p>
              </form>
            ) : (
              <p className="mt-6 text-sm text-stone">In development. Early access details coming soon.</p>
            )}

            <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-stone">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-charcoal" />
              Built in Sydney, for women who lift.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8">
            <nav aria-label="Footer navigation">
              <h2 className="text-sm font-normal text-stone">MayRoar</h2>
              <ul className="mt-5 space-y-4">
                <li><a href="#how-it-works" className={linkClass}>How it works</a></li>
                <li><a href="#approach" className={linkClass}>Our approach</a></li>
                {contactEmail && <li><a href={`mailto:${contactEmail}`} className={linkClass}>Contact us</a></li>}
              </ul>

              {socialLinks.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-sm font-normal text-stone">Connect</h2>
                  <ul className="mt-5 space-y-4">
                    {socialLinks.map((link) => <li key={link.href}><a href={link.href} className={linkClass}>{link.label}</a></li>)}
                  </ul>
                </div>
              )}
            </nav>

            <div>
              <h2 className="text-sm font-normal text-stone">What we’re building</h2>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed">
                <li>Nutrition tracking</li>
                <li>Workout logging</li>
                <li>Wearable connections</li>
                <li>Personal insights</li>
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-normal text-stone">Our principles</h2>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed">
                <li>Your own patterns</li>
                <li>Evidence with context</li>
                <li>Clear explanations</li>
                <li>Privacy from day one</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-6 text-xs leading-relaxed text-stone sm:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} MayRoar. All rights reserved.</p>
          {legalLinks.length > 0 && (
            <nav aria-label="Legal">
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {legalLinks.map((link) => <li key={link.href}><a href={link.href} className="rounded-sm hover:text-charcoal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal">{link.label}</a></li>)}
              </ul>
            </nav>
          )}
          <p>Understand your progress. Build your strength.</p>
        </div>
      </div>
    </footer>
  );
}
