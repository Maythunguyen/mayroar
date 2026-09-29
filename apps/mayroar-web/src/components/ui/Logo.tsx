import Image from "next/image";

type LogoProps = {
  size?: "small" | "large" | "hero";
  priority?: boolean;
};

const widthClasses = {
  small: "w-[120px]",
  large: "w-[460px] max-w-full",
  hero: "w-[75vw] max-w-[820px]",
};

export default function Logo({
  size = "small",
  priority = false,
}: LogoProps) {
  return (
    <span
      className={`
        relative block aspect-[820/420] shrink-0
        ${widthClasses[size]}
      `}
    >
      <Image
        src="/images/mayroar-logo-light-crop-hero.png"
        alt="MayRoar"
        fill
        sizes={
          size === "hero"
            ? "(max-width: 1093px) 75vw, 820px"
            : size === "large"
              ? "(max-width: 460px) 100vw, 460px"
              : "120px"
        }
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}