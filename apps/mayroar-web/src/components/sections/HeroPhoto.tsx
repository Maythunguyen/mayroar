import Image from "next/image";

export default function HeroPhoto() {
  return (
    <div className="relative z-10 -mt-[8%]">
      <Image
        src="/images/hero-gym.png"
        alt="A woman preparing to lift a barbell in the gym"
        width={1672}
        height={941}
        sizes="100vw"
        className="block h-auto w-full"
      />
    </div>
  );
}