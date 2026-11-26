// Path from the root scene to the current one. Every step but the last links
// back up; the last one is the current page.
import Link from "next/link";

export interface Crumb {
  id: string;
  title: string;
  href: string;
}

export interface BreadcrumbsProps {
  items: readonly Crumb[];
  /** Accessible name of the navigation landmark. */
  label: string;
}

export function Breadcrumbs({ items, label }: BreadcrumbsProps) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.id} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-semibold">
                  {item.title}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="text-zinc-300 underline-offset-2 hover:text-white hover:underline">
                    {item.title}
                  </Link>
                  <span aria-hidden="true" className="text-zinc-500">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
