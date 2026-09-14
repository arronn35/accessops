import { ImageResponse } from "next/og";
import { OG_ALT, OG_SIZE, OgArtwork } from "@/components/brand/OgArtwork";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<OgArtwork />, { ...size });
}
