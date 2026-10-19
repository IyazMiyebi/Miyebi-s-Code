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
} as const;

export const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/collections/mini-bags", label: "Mini bags" },
  { href: "/charm-bar", label: "Charm Bar" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "Our story" },
] as const;
