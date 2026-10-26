import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { returns } from "@/content/pages";

export const metadata: Metadata = {
  title: "Returns & exchanges",
  description: "Exchanges, refunds and what to do if something isn't right with your order.",
};

export default function Returns() {
  return (
    <InfoPage title="Returns & exchanges" intro={returns.intro}>
      {returns.sections.map((s) => (
        <InfoSection key={s.title} title={s.title}>
          {s.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </InfoSection>
      ))}
      <WhatsAppLink
        message="Hi Nimi! I'd like to ask about a return or exchange. My order number is "
        withPage={false}
        className="label inline-block rounded-full bg-accent px-6 py-3.5 text-accent-ink hover:opacity-85"
      >
        Start a return on WhatsApp
      </WhatsAppLink>
    </InfoPage>
  );
}
