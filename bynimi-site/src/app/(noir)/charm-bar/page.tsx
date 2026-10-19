import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "The Charm Bar" };

export default function CharmBar() {
  return (
    <ComingSoon title="The Charm Bar" stage={4}>
      Cherries, bears, cats and initials, hanging on their strings. Pick one up, give it a swing, and add it to your bag.
    </ComingSoon>
  );
}
