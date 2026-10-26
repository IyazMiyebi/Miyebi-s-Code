import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { contact } from "@/content/pages";
import { store } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contact",
  description: "WhatsApp, email, Instagram and TikTok. Bags by Nimi, Isolo, Lagos.",
};

export default function Contact() {
  const links = [
    { label: "Email", value: store.email, href: `mailto:${store.email}` },
    { label: "Phone", value: store.phone.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, "+234 $1 $2 $3"), href: `tel:${store.phone}` },
    { label: "Instagram", value: "@by.nimiie", href: store.social.instagram },
    { label: "TikTok", value: "@bagsbynimi", href: store.social.tiktok },
  ];
  return (
    <InfoPage eyebrow="Contact" title="Say hello" intro={contact.intro}>
      <WhatsAppLink
        message="Hi Nimi! "
        withPage={false}
        className="label inline-flex items-center gap-3 rounded-full bg-accent px-7 py-4 text-accent-ink hover:opacity-85"
      >
        Chat on WhatsApp
      </WhatsAppLink>

      <InfoSection title="Other ways">
        <dl className="divide-y divide-line border-y border-line">
          {links.map((l) => (
            <div key={l.label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt className="text-muted">{l.label}</dt>
              <dd>
                <a href={l.href} className="underline-offset-4 hover:text-accent hover:underline">
                  {l.value}
                </a>
              </dd>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
            <dt className="text-muted">Studio</dt>
            <dd>{store.location}</dd>
          </div>
        </dl>
      </InfoSection>

      <InfoSection title="When we're around">
        <dl className="divide-y divide-line border-y border-line">
          {contact.hours.map((h) => (
            <div key={h.days} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt>{h.days}</dt>
              <dd className="text-muted">{h.time}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>
    </InfoPage>
  );
}
