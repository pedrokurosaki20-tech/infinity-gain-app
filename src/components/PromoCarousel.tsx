import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import banner1 from "@/assets/banner-indique-ganhe.png.asset.json";
import banner2 from "@/assets/banner-treinamento-ia.png.asset.json";
import banner3 from "@/assets/banner-sistema-email.png.asset.json";

type Banner = {
  src: string;
  alt: string;
  to?: string;
  params?: Record<string, string>;
};

const banners: Banner[] = [
  { src: banner1.url, alt: "Indique e ganhe — Infinity Gain" },
  { src: banner2.url, alt: "Treinamento de IA — Infinity Gain" },
  {
    src: banner3.url,
    alt: "Sistema de E-mail — Infinity Gain",
    to: "/task/$slug",
    params: { slug: "sistema-email" },
  },
];

export function PromoCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center" },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="w-full">
      <div
        ref={emblaRef}
        className="overflow-hidden rounded-[20px] shadow-soft"
      >
        <div className="flex touch-pan-y">
          {banners.map((b, i) => {
            const img = (
              <img
                src={b.src}
                alt={b.alt}
                className="block h-auto w-full select-none"
                draggable={false}
              />
            );
            return (
              <div key={i} className="relative min-w-0 flex-[0_0_100%]">
                {b.to ? (
                  <Link
                    to={b.to}
                    params={b.params as never}
                    className="block"
                    aria-label={b.alt}
                  >
                    {img}
                  </Link>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Ir para banner ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              selected === i ? "w-6 bg-white" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
