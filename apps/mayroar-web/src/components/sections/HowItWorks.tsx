"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Apple01Icon,
  Dumbbell01Icon,
  Calendar01Icon,
  Analytics01Icon,
  AiChat02Icon,
  ArtificialIntelligence04Icon,
} from "@hugeicons/core-free-icons";

const features = [
  {
    number: "01",
    category: "Nutrition",
    title: "Food, made easier to track.",
    description:
      "Find foods, scan barcodes and log meals in amounts that make sense to you. See calories and protein alongside carbs and fat.",
    icon: Apple01Icon,
  },
  {
    number: "02",
    category: "Training",
    title: "See your strength take shape.",
    description:
      "Record exercises, sets, reps and effort. Look back at personal bests and spot where progress has slowed.",
    icon: Dumbbell01Icon,
  },
  {
    number: "03",
    category: "Menstrual Cycle",
    title: "Understand your body's rhythm.",
    description:
      "Track your cycle and see how it relates to your training, recovery and nutrition. Get insights on how to adjust your plan based on your cycle phase.",
    icon: Calendar01Icon,
  },
  {
    number: "04",
    category: "Insight",
    title: "Find your own patterns.",
    description:
      "Over time, connect performance with recovery, sleep and other context. Recommendations will explain what the data shows and what is only a possibility.",
    icon: Analytics01Icon,
  },
  {
    number: "05",
    category: "Coaching",
    title: "Get personalized guidance.",
    description:
      "Get tailored advice and support to help you reach your goals. Our coaching team will work with you to create a plan that fits your unique needs and circumstances.",
    icon: AiChat02Icon,
  },
  {
    number: "06",
    category: "AI Analytics",
    title: "Get data-driven insights.",
    description:
      "Leverage the power of AI to gain deeper insights into your performance. Our analytics engine will process your data and provide actionable recommendations to help you optimize your training and recovery.",
    icon: ArtificialIntelligence04Icon,
  },
];

type FeatureCardProps = {
  feature: (typeof features)[number];
};

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <article className="group relative isolate flex flex-col bg-cream py-10 lg:py-12">
      {/* Soft background on hover */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0 -z-10
          bg-linear-to-t from-rose/10 to-transparent
          opacity-0 transition-opacity duration-300
          group-hover:opacity-100
          motion-reduce:transition-none
        "
      />

      <div className="px-6 sm:px-8 lg:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone">
          {feature.number} / {feature.category}
        </p>

        <HugeiconsIcon
          icon={feature.icon}
          size={40}
          strokeWidth={1.5}
          aria-hidden="true"
          className="
            mb-8 mt-8 text-charcoal
            transition-colors duration-300
            group-hover:text-rose
            motion-reduce:transition-none
          "
        />
      </div>

      <div className="relative px-6 sm:px-8 lg:px-10">
        {/* Accent beside the title */}
        <span
          aria-hidden="true"
          className="
            absolute left-0 top-1 h-6 w-1 rounded-r-full
            bg-line transition-all duration-300
            group-hover:h-8 group-hover:bg-rose
            motion-reduce:transition-none
          "
        />

        <h3
          className="
            text-xl font-medium leading-snug tracking-tight
            transition-transform duration-300
            group-hover:translate-x-2
            motion-reduce:transform-none motion-reduce:transition-none
          "
        >
          {feature.title}
        </h3>
      </div>

      <p className="mt-4 px-6 text-sm leading-relaxed text-stone sm:px-8 lg:px-10">
        {feature.description}
      </p>
    </article>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="bg-cream pt-20 text-charcoal sm:pt-24 lg:pt-32"
    >
      <div className="mx-auto px-6 sm:px-8 lg:px-14">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-stone">
            How it works
          </p>

          <h2
            id="how-it-works-heading"
            className="
              text-3xl font-medium leading-[1.1] tracking-tight
              sm:text-4xl lg:text-5xl
            "
          >
            More than a workout log.
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-stone">
            We’re starting with everyday tools and building toward
            insights that make sense for your own body and training
            history.
          </p>
        </div>

        {/* One-pixel gaps create shared borders between cards */}
        <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.number} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}