import Image from "next/image";
import Link from "next/link";
import { cardImages, leadVariant, priceRange, swatches, totalStock, type Product, type Variant } from "@/lib/product";
import { variantHref, variantsMatching } from "@/lib/variant-link";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";
import { SwatchDots } from "./swatch-dots";

export function ProductCard({
  product: full,
  options,
  variants,
  priority = false,
}: {
  product: Product;
  /** Feature only these options, e.g. { Finish: "Suede Velvet" }: photo, price, colours and link. */
  options?: Record<string, string>;
  /** Or feature exactly these variants (e.g. the ones a shop filter matched). */
  variants?: Variant[];
  priority?: boolean;
}) {
  const featured = variants ?? (options ? variantsMatching(full, options) : []);
  const narrowed = featured.length > 0 && featured.length < full.variants.length;
  // Narrowed to the featured variants (and their photos), when there are any.
  const product = narrowed ? { ...full, variants: featured, images: [] } : full;
  const [cover, hover] = cardImages(product);
  const colours = swatches(product);
  const stock = totalStock(product);
  const range = priceRange(product);
  // A narrowed card opens on exactly the variant in its photo.
  const lead = narrowed ? leadVariant(product) : undefined;

  return (
    <Link href={variantHref(full.slug, lead?.options)} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        {cover && (
          <Image
            src={cover}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.03]"
          />
        )}
        {hover && (
          <Image
            src={hover}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        <StockBadge stock={stock} className="absolute top-3 left-3" />
      </div>

      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <h3 className="font-serif text-xl leading-tight">{product.name}</h3>
        <p className="label shrink-0 sm:pt-1">
          <Price ngn={range.min} from={range.min !== range.max} />
        </p>
      </div>
      {colours.length > 1 && <SwatchDots swatches={colours} className="mt-2" />}
    </Link>
  );
}
