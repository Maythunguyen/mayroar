import Image from "next/image";

type LogoIconProps = {
  size?: number;
  priority?: boolean;
};

export default function LogoIcon({
  size = 64,
  priority = false,
}: LogoIconProps) {
  return (
    <Image
      src="/images/logo-icon-crop.png"
      alt="MayRoar"
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className="block h-auto object-contain"
      style={{ width: size }}
    />
  );
}