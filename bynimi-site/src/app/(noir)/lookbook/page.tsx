import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Lookbook" };

export default function Lookbook() {
  return (
    <ComingSoon title="Lookbook" stage={4}>
      The season in pictures. Move your cursor (or your finger) and the bags follow in a trail of images.
    </ComingSoon>
  );
}
