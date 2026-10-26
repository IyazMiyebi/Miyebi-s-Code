// The lookbook: campaign and lifestyle photos from the current store, each
// linked to the bag in it (and its exact finish and colour where we know it).
// Placeholders until Nimi's new shoot; add or reorder freely.

const PRODUCTS = "https://dodptt9f4zk9h.cloudfront.net/stores/8942/products";

export type LookbookPhoto = {
  src: string;
  alt: string;
  product: string;
  options?: Record<string, string>;
  /** Shown under the photo, e.g. the colour. */
  caption: string;
  /** Collages with words on them sit out of the cursor trail. */
  trail?: boolean;
};

const photo = (file: string, rest: Omit<LookbookPhoto, "src">): LookbookPhoto => ({ src: `${PRODUCTS}/${file}`, trail: true, ...rest });

export const lookbook: LookbookPhoto[] = [
  photo("8475813577976dfac005e7376fc65c2d12c8fe75.jpeg", {
    alt: "Two friends holding Dahlia Minis in espresso and navy",
    product: "the-dahlia-mini",
    options: { Finish: "Classic Smooth Leather", Colour: "Dark Espresso" },
    caption: "The Dahlia Mini · Dark Espresso",
  }),
  photo("5a33bc5f6763aadff9977ceabaca2a41ee1c9907.jpeg", {
    alt: "A woman holding The Avaia close against a dark backdrop",
    product: "the-avaia",
    caption: "The Avaia",
  }),
  photo("fc0c99f0d75e916dbc8d4f923c625b660450b80d.jpeg", {
    alt: "A lilac croc-embossed Dahlia Mini with an Ankara dress",
    product: "the-dahlia-mini",
    options: { Finish: "Croc Embossed Leather", Colour: "Lilac" },
    caption: "The Dahlia Mini · Lilac croc",
  }),
  photo("09e05a6bab8ebd42602c52010b6c738a08c7a487.jpeg", {
    alt: "The Liora worn with a white vest and jeans",
    product: "the-liora",
    caption: "The Liora",
  }),
  photo("606d5e6823130f4294e61384c0ed34e4834d6c7c.jpeg", {
    alt: "Out in Lagos with a Dark Crimson suede velvet Dahlia Mini",
    product: "the-dahlia-mini",
    options: { Finish: "Suede Velvet", Colour: "Dark Crimson" },
    caption: "The Dahlia Mini · Dark Crimson velvet",
  }),
  photo("c8112efe0d0d67991a31a2f050f562d2b6c339ee.jpeg", {
    alt: "The leopard print Dahlia Mini on a woven chair",
    product: "the-dahlia-mini",
    options: { Finish: "Animal Print", Colour: "Leopard" },
    caption: "The Dahlia Mini · Leopard",
  }),
  photo("96bb529ade4e151a48e9953ff80006a5c5818f06.jpeg", {
    alt: "The Avaia carried on the shoulder",
    product: "the-avaia",
    caption: "The Avaia",
  }),
  photo("8fadf94022f918c3f823d1bbfc21f51f82e461b3.jpeg", {
    alt: "A white dress and a green woven Dahlia Mini",
    product: "the-dahlia-mini",
    options: { Finish: "Woven Leather", Colour: "Green" },
    caption: "The Dahlia Mini · Green woven",
  }),
  photo("6ec270b625302d3dbc9d9887e6408e99cab0e7c6.jpeg", {
    alt: "The Liora on the shoulder, arms crossed",
    product: "the-liora",
    caption: "The Liora",
  }),
  photo("c6d22b2fd0b1353bd9e48fa4d0a523c6894bed3e.jpeg", {
    alt: "A purple Alissa Clutch with an embroidered green outfit",
    product: "the-alissa-clutch",
    options: { Finish: "Classic Smooth Leather", Colour: "Purple" },
    caption: "The Alissa Clutch · Purple",
  }),
  photo("94c07bc73d5719f4dfbfe03222aaef08c056ffdd.jpeg", {
    alt: "A green woven Dahlia Mini in front of a wall of white balloons",
    product: "the-dahlia-mini",
    options: { Finish: "Woven Leather", Colour: "Green" },
    caption: "The Dahlia Mini · Green woven",
  }),
  photo("b1b31f0af385b2bf3967e7f5d215e9f68a713203.jpeg", {
    alt: "The Liora worn with denim, seen from the side",
    product: "the-liora",
    caption: "The Liora",
  }),
  photo("f52b200ab76b70fd7d2d5f6ee1f58ed01f9c8396.jpeg", {
    alt: "An Ankara two-piece with a lilac Dahlia Mini, full length",
    product: "the-dahlia-mini",
    options: { Finish: "Croc Embossed Leather", Colour: "Lilac" },
    caption: "The Dahlia Mini · Lilac croc",
  }),
  photo("29d7ce6ed96577370de7c88f4ecc248a908004c5.png", {
    alt: "The Avaia campaign poster",
    product: "the-avaia",
    caption: "The Avaia campaign",
    trail: false,
  }),
  photo("98ceaa0feea1e72c6735b814db18cc3d6326336e.png", {
    alt: "The Liora campaign poster: one silhouette, many ways to style",
    product: "the-liora",
    caption: "The Liora campaign",
    trail: false,
  }),
];
