// Store-wide details. Moves into the Supabase settings table in Stage 5 so
// Nimi can edit it without code.

export const store = {
  name: "Bags by Nimi",
  tagline: "Elegance in simplicity",
  description:
    "Handcrafted mini bags, shoulder bags and charms from Lagos. Bold minimalism, timeless form. Dispatched same or next day.",
  url: "https://bynimiie.com",
  email: "by.nimiie@gmail.com",
  phone: "+2348085280400",
  location: "Isolo, Lagos, Nigeria",
  social: {
    instagram: "https://instagram.com/by.nimiie",
    tiktok: "https://www.tiktok.com/@bagsbynimi",
    whatsapp: "https://wa.me/2348085280400",
  },
  // One first-order offer everywhere (the old site's banner said 10% and its
  // pop-up said 20%). Nimi to confirm which.
  announcements: [
    "Dispatched same or next day",
    "10% off your first order with code WELCOME10",
    "Free shipping on your first 5 UK orders",
    "Pre-order anything that's sold out",
  ],
  // From the old site's homepage.
  testimonials: [
    { name: "Mat", quote: "I absolutely love shopping with Nimi. Her designs are unique, and the quality? Impeccable!" },
    { name: "Feyikemi Odesanmi", quote: "Amazing bag ❤❤❤" },
    { name: "Nissi Jatau", quote: "New found favorite bag" },
    { name: "Deborah-Ruth Isimoya", quote: "Great purchase!" },
    { name: "Daniel Eda", quote: "Lovely bag" },
    { name: "Atilehin", quote: "★★★★★" },
    { name: "Esther Ibeh", quote: "★★★★★" },
    { name: "Deborah Guful", quote: "🥰" },
  ],
  // Collections that are really one finish of a product: their cards show
  // and open that finish (e.g. the Dahlia in suede velvet).
  collectionOptions: {
    "the-suede-velvet-edit": { Finish: "Suede Velvet" },
    "asooke-designs": { Finish: "Asooke" },
  } as Record<string, Record<string, string>>,
  home: {
    // Campaign shot: two Dahlia Minis. Swap for Nimi's own hero photo later.
    heroImage:
      "https://dodptt9f4zk9h.cloudfront.net/stores/8942/products/8475813577976dfac005e7376fc65c2d12c8fe75.jpeg",
    heroAlt: "Two women holding Dahlia Mini bags in brown and navy",
  },
} as const;

/** A WhatsApp chat with Nimi, with a message already typed. */
export function whatsappLink(message: string) {
  return `${store.social.whatsapp}?text=${encodeURIComponent(message)}`;
}

export const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/collections/mini-bags", label: "Mini bags" },
  { href: "/charm-bar", label: "Charm Bar" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "Our story" },
] as const;
