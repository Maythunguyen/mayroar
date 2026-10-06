import { Image } from "expo-image";
export type DesignAsset = { source: number; width: number; height: number };
export function DesignIcon({ asset }: { asset: DesignAsset }) {
  return (
    <Image
      source={asset.source}
      style={{ width: asset.width, height: asset.height }}
      contentFit="contain"
      accessible={false}
    />
  );
}
