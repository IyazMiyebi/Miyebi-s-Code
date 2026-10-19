import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Our story" };

export default function About() {
  return (
    <ComingSoon title="Our story" stage={4}>
      How Bags by Nimi began in Lagos, and the thinking behind every stitch.
    </ComingSoon>
  );
}
