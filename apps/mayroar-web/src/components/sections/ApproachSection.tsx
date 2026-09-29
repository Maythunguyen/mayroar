import type { ReactNode } from "react";

/**
 * React / Next.js + Tailwind CSS. No extra packages or client JS required.
 * Save as components/ApproachSection.tsx, then render <ApproachSection />.
 * Optional: images={["/images/food.jpg", undefined, "/images/lifting.jpg"]}
 * Images are decorative backgrounds; use local files in your public folder.
 * All values below are illustrative product mockups, not live user data.
 */
type ApproachSectionProps = {
  images?: readonly (string | undefined)[];
  className?: string;
};

const steps = [
  {
    title: "Build your foundation",
    description:
      "Start with everyday food tracking. We’re building tools to make meals, calories and macros easier to understand.",
    background: "bg-[#ded8cc]",
  },
  {
    title: "See your strength",
    description:
      "Next, build your training history. Track weights, reps and effort to see how your strength changes over time.",
    background: "bg-[#eeede9]",
  },
  {
    title: "Add your context",
    description:
      "Planned recovery and wearable connections will bring sleep, energy and optional cycle context into the picture.",
    background: "bg-[#a9afa0]",
  },
  {
    title: "Learn and refine",
    description:
      "Our goal: guidance based on your own patterns, with clear reasons and honesty about what’s still uncertain.",
    background: "bg-[#cec1b1]",
  },
] as const;

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-white/25 bg-[#292824]/85 p-4 text-[#f8f6ef] shadow-xl backdrop-blur-md">
      {children}
    </div>
  );
}

function FoodVisual() {
  return (
    <>
      <div className="absolute -right-8 -top-8 h-56 w-56 rounded-full border-[24px] border-white/30 bg-[#b9bea0] shadow-lg" />
      <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-[#b6916d]/40" />
      <div className="absolute inset-x-5 bottom-8">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Lunch, logged.</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-[#e4e8cd] text-[#292824]">✓</span>
          </div>
          <p className="mt-3 text-xs text-white/70">Salmon, rice & greens</p>
          <div className="mt-3 flex gap-4 border-t border-white/15 pt-3 text-xs">
            <span>520 kcal</span><span>34 g protein</span>
          </div>
        </Panel>
      </div>
    </>
  );
}

function StrengthVisual() {
  return (
    <div className="absolute inset-x-8 -bottom-9 top-12 rounded-t-[30px] border-[5px] border-[#dededb] bg-white px-4 pb-10 pt-3 shadow-lg">
      <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#292824]" />
      <div className="flex items-center justify-between text-[10px] text-[#797a74]">
        <span>MAYROAR</span><span>Training</span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight">Your strength</p>
      <p className="mt-1 text-[10px] text-[#797a74]">Small steps. Stronger over time.</p>
      <div className="mt-4 rounded-xl bg-[#f3f3ee] p-3">
        <div className="flex items-center justify-between text-xs">
          <span>Hip thrust</span><span className="text-[#68734a]">Personal best</span>
        </div>
        <p className="mt-2 text-2xl font-semibold">80 <span className="text-xs font-normal text-[#797a74]">kg × 8 reps</span></p>
      </div>
      <div className="mt-4 flex h-16 items-end gap-2">
        {[35, 45, 43, 60, 72, 85, 100].map((height, index) => (
          <div key={index} className="flex-1 rounded-t bg-[#959f79]" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

function ContextVisual() {
  return (
    <>
      <div className="absolute -right-12 top-8 h-80 w-40 rotate-[-25deg] rounded-full bg-[#64705c]/30" />
      <div className="absolute inset-x-5 bottom-8">
        <Panel>
          <p className="mb-4 text-sm font-medium">More of your picture</p>
          {[
            ["Sleep", "7 h 42 min"],
            ["Energy", "Feeling good"],
            ["Training effort", "Challenging"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2 border-t border-white/15 py-2.5 text-xs last:pb-0">
              <span className="text-white/65">{label}</span><span>{value}</span>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}

function TrendsVisual() {
  return (
    <div className="absolute inset-x-5 bottom-8">
      <Panel>
        <p className="text-sm font-medium">Progress has a pattern.</p>
        <p className="mt-1 text-[10px] text-white/60">Your training, over time</p>
        <svg viewBox="0 0 240 130" className="mt-3 w-full" fill="none">
          {[25, 65, 105].map((y) => (
            <path key={y} d={`M10 ${y} H230`} stroke="white" strokeOpacity="0.15" />
          ))}
          <path d="M10 100 L50 82 L90 89 L130 57 L175 65 L230 22" stroke="#dce5b5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="100" r="4" fill="#292824" stroke="#f8f6ef" strokeWidth="2" />
          <circle cx="230" cy="22" r="6" fill="#dce5b5" stroke="#f8f6ef" strokeWidth="2" />
        </svg>
        <div className="flex justify-between text-[10px] text-white/70"><span>Week 1</span><span>Week 6</span><span>Week 12</span></div>
      </Panel>
    </div>
  );
}

const visuals = [FoodVisual, StrengthVisual, ContextVisual, TrendsVisual];

export default function ApproachSection({
  images = [],
  className = "",
}: ApproachSectionProps) {
  return (
    <section
      id="approach"
      aria-labelledby="approach-heading"
      className={`bg-cream pt-20 text-charcoal sm:pt-24 lg:pt-32 ${className}`}
    >
      <div className="mx-auto px-6 sm:px-8 lg:px-14">
        <header className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-stone">
                Our approach
            </p>

            <h2
                id="approach-heading"
                className="text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl"
            >
                Every session adds to your story.
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone">
                We’re building MayRoar step by step, connecting your food,
                training and recovery to help you understand your progress.
            </p>
        </header>

        <ol className="mt-12 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Visual = visuals[index];
            const photo = images[index];

            return (
              <li key={step.title} className="min-w-0">
                <div
                  aria-hidden="true"
                  className={`relative isolate aspect-square overflow-hidden rounded-xl ${step.background}`}
                >
                  {photo && (
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}

                  {Visual && <Visual />}

                  <span className="absolute left-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-md bg-charcoal/35 text-xs font-medium text-white backdrop-blur-md">
                    {index + 1}
                  </span>

                  <span className="absolute bottom-2 right-3 text-[9px] font-medium uppercase tracking-widest text-charcoal/70">
                    Illustrative preview
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-medium leading-snug tracking-tight">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-stone">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}