// Words for the brand and help pages. Everything here is DRAFT placeholder
// text written for the build: Nimi to rewrite it in her own voice (it moves
// into the back office in Stage 5). Pages show a "Draft" tag while `draft`
// is true, so nobody mistakes it for the final policy.

export const draft = true;

export const helpNav = [
  { href: "/shipping", label: "Shipping & delivery" },
  { href: "/returns", label: "Returns & exchanges" },
  { href: "/care", label: "Caring for your bag" },
  { href: "/faq", label: "FAQ" },
  { href: "/gift-cards", label: "Gift cards" },
  { href: "/inner-circle", label: "The Inner Circle" },
  { href: "/contact", label: "Contact" },
] as const;

// ---------------------------------------------------------------------------
// Our story (/about)

export const story = {
  eyebrow: "Our story",
  title: "Made small, on purpose.",
  intro:
    "Bags by Nimi began on a workbench in Lagos with one idea: a bag should be simple enough to carry every day and special enough that people ask where it's from.",
  paragraphs: [
    "Nimi started by making mini bags for friends: one at a time, cut, stitched and finished by hand. The friends told their friends, the orders came in over WhatsApp and Instagram, and a small studio in Isolo became the home of the brand.",
    "Every design starts with the shape. The Dahlia Mini took months to get right: a soft structured body, a top handle that sits comfortably in the hand, and just enough room for a phone, cards and a lipstick. Once the shape is right, the fun begins: suede velvet, woven leather, croc-embossed finishes, Asooke from Nigerian weavers, and colours that go from everyday black to the brightest pink.",
    "We make in small batches. It means fewer bags of each colour, and sometimes a wait for the one you want, but it also means nothing is wasted and every bag gets proper attention before it leaves the studio. When something sells out, you can pre-order it and we'll make yours.",
    "Our charms and scarves came from customers who wanted to make their bags their own. Clip on a cherry, a little bear or your initial, tie on a scarf, and no two bags look quite the same.",
    "Thank you for carrying Bags by Nimi. Every order, every tag and every message means a great deal to a small Lagos business.",
  ],
  pullQuote: "Elegance in simplicity: bold shapes, honest materials, made to be carried every day.",
  values: [
    { title: "Handmade in Lagos", body: "Cut, stitched and finished in our Isolo studio." },
    { title: "Small batches", body: "Fewer of each colour, and nothing made to sit in a warehouse." },
    { title: "Made to be yours", body: "Charms, scarves and initials to make every bag personal." },
  ],
};

// ---------------------------------------------------------------------------
// Shipping (/shipping). Fees come from the live delivery zones; these are the
// words around them.

export const shipping = {
  intro:
    "Every order is packed by hand and dispatched the same or next working day. We'll message you on WhatsApp when it's on its way.",
  timings: [
    { where: "Lagos", when: "1 to 2 working days after dispatch" },
    { where: "Rest of Nigeria", when: "2 to 5 working days, by courier or park pick-up" },
    { where: "United Kingdom", when: "7 to 10 working days" },
    { where: "Rest of the world", when: "7 to 14 working days" },
  ],
  notes: [
    "Orders placed after 4pm, or at weekends and public holidays, are dispatched the next working day.",
    "Pre-orders are made for you and usually ship within 2 to 3 weeks. We'll keep you posted on WhatsApp.",
    "International parcels may be charged import duties or taxes by your country's customs. These aren't included in our prices and are paid by the recipient.",
    "Picking up in Okota? We'll message you as soon as your order is ready to collect.",
  ],
};

// ---------------------------------------------------------------------------
// Returns (/returns)

export const returns = {
  intro:
    "We want you to love your bag. If something isn't right, tell us within 3 days of delivery and we'll sort it out.",
  sections: [
    {
      title: "Exchanges",
      body: [
        "Changed your mind about the colour? You can exchange an unused bag within 7 days of delivery, as long as it's in its original condition with tags and packaging.",
        "Message us on WhatsApp with your order number to arrange the exchange. Return delivery is paid by you; we cover sending the new one.",
      ],
    },
    {
      title: "Refunds",
      body: [
        "If your bag arrives damaged or faulty, or we've sent the wrong item, we'll replace it or refund you in full, including delivery.",
        "Please send us photos within 3 days of delivery so we can put it right quickly. Refunds go back to the card or account you paid with, within 5 to 10 working days.",
      ],
    },
    {
      title: "What we can't take back",
      body: [
        "Charms, scarves and personalised items (such as initial charms), for hygiene and because they're made for you.",
        "Items that have been used, damaged after delivery, or bought in a final sale.",
        "Gift cards.",
      ],
    },
    {
      title: "Pre-orders",
      body: [
        "You can cancel a pre-order for a full refund until we start making it. Once it's in production it's treated like any other order.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Care guide (/care)

export const care = {
  intro: "A little care keeps your bag looking new for years. Here's how we look after ours.",
  everyday: [
    "Store your bag stuffed with tissue paper, in its dust bag, away from direct sunlight.",
    "Keep it away from perfume, hand cream and make-up: wait until they've dried before you pick it up.",
    "Don't overfill it. Mini bags keep their shape best with the essentials only.",
    "Hang it by the strap, not the handle, if you hang it at all.",
  ],
  finishes: [
    {
      name: "Classic smooth leather",
      tips: "Wipe with a soft, dry cloth. For marks, use a barely damp cloth and let it air-dry. A leather conditioner every few months keeps it supple.",
    },
    {
      name: "Suede velvet",
      tips: "Brush gently in one direction with a soft suede brush. Keep it away from water; if it gets wet, blot (don't rub) and let it dry naturally.",
    },
    {
      name: "Croc-embossed and textured pebble",
      tips: "Dust the grooves with a soft brush, then wipe with a dry cloth. Avoid heat, which can flatten the texture.",
    },
    {
      name: "Woven leather",
      tips: "Don't pull at the weave. Brush away dust and store it flat so the weave keeps its shape.",
    },
    {
      name: "Asooke",
      tips: "Hand-woven fabric: spot clean only, with a damp cloth and no harsh soap. Never machine wash.",
    },
    {
      name: "Charms and hardware",
      tips: "Polish metal with a dry jewellery cloth. Keep fluffy charms away from water, and brush them gently to fluff them up again.",
    },
  ],
};

// ---------------------------------------------------------------------------
// FAQ (/faq)

export const faq: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: "Orders",
    items: [
      {
        q: "How soon will my order be dispatched?",
        a: "The same or next working day. You'll get a message on WhatsApp when it's on its way, and delivery times are on the Shipping page.",
      },
      {
        q: "Something I want is sold out. Can I still get it?",
        a: "Yes. Most sold-out colours can be pre-ordered from their product page: leave your WhatsApp number and Nimi will confirm the details. Or tap \"Notify me\" and we'll email you when it's back.",
      },
      {
        q: "Do you have a discount for first orders?",
        a: "Yes: use WELCOME10 at checkout for 10% off your first order.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "Message us on WhatsApp as soon as you can. If it hasn't been dispatched yet, we'll do our best.",
      },
    ],
  },
  {
    group: "Payment and prices",
    items: [
      {
        q: "How can I pay?",
        a: "By card, bank transfer or USSD, through Paystack's secure payment page. We never see or store your card details.",
      },
      {
        q: "I'm outside Nigeria. Which currency will I pay in?",
        a: "Prices are shown in your currency (£, $, € or C$). Paystack charges the Naira equivalent at the day's exchange rate, which is shown at checkout before you pay. Your bank converts it back, so the amount on your statement may differ slightly.",
      },
      {
        q: "Can I use a gift card?",
        a: "Yes. Enter the code at checkout. If the gift card doesn't cover everything, you pay the rest by card or transfer, and any balance left stays on the card for next time.",
      },
    ],
  },
  {
    group: "Delivery",
    items: [
      {
        q: "Do you deliver outside Nigeria?",
        a: "Yes: to the UK, Ireland, the USA and Canada, France, Germany, Italy, South Africa and Australia. Your first 5 UK orders ship free. Somewhere else? Ask us on WhatsApp.",
      },
      {
        q: "Can I pick up my order?",
        a: "Yes, from Okota in Lagos (free) or the park in Port Harcourt. Choose pick-up at checkout and we'll message you when it's ready.",
      },
    ],
  },
  {
    group: "The bags",
    items: [
      {
        q: "How big is the Dahlia Mini?",
        a: "Big enough for a phone, cards, keys and a lipstick. Each product page lists the measurements.",
      },
      {
        q: "Are the bags real leather?",
        a: "Each product page lists its materials. Our finishes include smooth, croc-embossed, textured pebble and woven leather, suede velvet and hand-woven Asooke.",
      },
      {
        q: "Will my bag look exactly like the photo?",
        a: "Very close. Colours can look slightly different on different screens, and handmade finishes like Asooke vary a little from bag to bag, which is part of their charm.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Contact (/contact)

export const contact = {
  intro: "The quickest way to reach us is WhatsApp. We usually reply within a few hours.",
  hours: [
    { days: "Monday to Friday", time: "9am to 6pm" },
    { days: "Saturday", time: "10am to 4pm" },
    { days: "Sunday and public holidays", time: "Closed (messages answered on Monday)" },
  ],
};

// ---------------------------------------------------------------------------
// The Inner Circle (/inner-circle): the loyalty programme. Points need
// customer accounts, which come after launch; until then it's the list.

export const innerCircle = {
  intro:
    "Our list for the people who love Bags by Nimi most: first look at new drops, early access to restocks, and rewards for every order.",
  perks: [
    { title: "Early access", body: "New colours and drops, a day before everyone else." },
    { title: "First dibs on restocks", body: "When a sold-out favourite is back, you'll hear first." },
    { title: "Points on every order", body: "Earn points as you shop and spend them on charms, scarves or your next bag. Coming soon." },
    { title: "A birthday treat", body: "Something special from us in your birthday month. Coming soon." },
  ],
};

// ---------------------------------------------------------------------------
// Gift cards (/gift-cards)

export const giftCards = {
  intro:
    "Can't choose the colour? Let them. A Bags by Nimi gift card arrives by email with your message, and can be spent on anything in the shop.",
  terms: [
    "Gift cards are sent by email straight after payment. The code also appears on the confirmation page.",
    "They can be spent over several orders, in the currency they were bought in. Any balance left stays on the card.",
    "Valid for 12 months from purchase. They can't be exchanged for cash or refunded.",
  ],
};
