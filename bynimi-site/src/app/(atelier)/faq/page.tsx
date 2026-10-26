import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { faq } from "@/content/pages";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Orders, pre-orders, payment, currencies, delivery and our bags: your questions answered.",
};

export default function Faq() {
  return (
    <InfoPage title="Questions, answered" intro="Can't find what you're looking for? Message us on WhatsApp.">
      {faq.map((g) => (
        <InfoSection key={g.group} title={g.group}>
          <div className="divide-y divide-line border-y border-line">
            {g.items.map((item) => (
              <details key={item.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="text-xl text-gold transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </InfoSection>
      ))}
      <WhatsAppLink
        message="Hi Nimi! I have a question: "
        withPage={false}
        className="label inline-block rounded-full border border-line px-6 py-3.5 hover:border-ink"
      >
        Ask on WhatsApp
      </WhatsAppLink>
    </InfoPage>
  );
}
