import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mx-auto max-w-page px-4 pb-8 pt-10 md:px-8 md:pb-12 md:pt-16">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-3 max-w-[20ch] text-2xl md:text-3xl">{title}</h1>
      {children && <div className="mt-6 max-w-prose text-lg text-pencil">{children}</div>}
    </header>
  );
}
