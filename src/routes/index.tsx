import { createFileRoute } from "@tanstack/react-router";

import { PixelCircle } from "@/components/PixelCircle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pixel Circle — a circle built from hundreds of images" },
      {
        name: "description",
        content:
          "An animated mosaic where hundreds of tiny images assemble into a single circle, each photograph acting as one indistinguishable pixel.",
      },
      { property: "og:title", content: "Pixel Circle — a circle built from hundreds of images" },
      {
        property: "og:description",
        content:
          "Watch hundreds of images fly in and lock together into a perfect circle, each one reduced to a single pixel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--glow),transparent_65%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-14 px-6 py-20">
        <header className="text-center">
          <p className="text-[0.7rem] tracking-[0.42em] text-muted-foreground uppercase">
            Mosaic study 01
          </p>
          <h1 className="mt-5 font-light text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
            One circle.
            <br />
            <span className="text-accent">Hundreds of images.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Each photograph is scaled down until it is nothing but a pixel — individually
            unreadable, collectively a perfect disc.
          </p>
        </header>

        <PixelCircle />
      </div>
    </main>
  );
}
