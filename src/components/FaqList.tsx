import type { FaqItem } from "@/data/faq";

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-rule border-y border-rule">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 font-serif text-lg text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden="true"
              className="shrink-0 font-sans text-xl leading-none text-postal transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="max-w-prose pb-6 text-pencil">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
