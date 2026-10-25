import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { OrganizationSummary } from "../types";

type OrganizationListProps = {
  heading: string;
  emptyMessage: string;
  organizations: OrganizationSummary[];
};

/** Associations and venues in a list (barrio page), by name. No ranking, no counters. */
export function OrganizationList({ heading, emptyMessage, organizations }: OrganizationListProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {organizations.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul aria-label={heading} className="flex flex-col gap-3">
          {organizations.map((organization) => (
            <li key={organization.slug} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
              <p className="text-sm text-muted">{t(`organization.kinds.${organization.kind}`)}</p>
              <h3 className="text-base font-semibold">
                <Link
                  href={`/a/${organization.slug}`}
                  className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light"
                >
                  {organization.name}
                </Link>
              </h3>
              {organization.oneLiner && <p className="text-sm">{organization.oneLiner}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
