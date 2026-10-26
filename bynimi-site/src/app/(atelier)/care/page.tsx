import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { care } from "@/content/pages";

export const metadata: Metadata = {
  title: "Caring for your bag",
  description: "How to look after smooth leather, suede velvet, croc-embossed, woven and Asooke bags, and charms.",
};

export default function Care() {
  return (
    <InfoPage eyebrow="Care guide" title="Caring for your bag" intro={care.intro}>
      <InfoSection title="Every day">
        <ul className="list-disc space-y-2 pl-5 marker:text-gold">
          {care.everyday.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </InfoSection>
      <InfoSection title="By finish">
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {care.finishes.map((f) => (
            <div key={f.name} className="bg-surface p-5">
              <dt className="font-serif text-2xl">{f.name}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted">{f.tips}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>
    </InfoPage>
  );
}
