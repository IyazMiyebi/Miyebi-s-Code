import Link from "next/link";

// Placeholder for pages that are planned in a later stage of the roadmap.
export function ComingSoon({ title, stage, children }: { title: string; stage: number; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <p className="label text-gold">Arriving in stage {stage}</p>
      <h1 className="mt-4 font-serif text-6xl leading-none sm:text-8xl">{title}</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">{children}</p>
      <Link href="/shop" className="label mt-10 border-b border-current pb-1 hover:text-accent">
        Shop the collection
      </Link>
    </section>
  );
}
