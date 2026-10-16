import { getRequestConfig } from "next-intl/server";
import { MADRID_TIME_ZONE } from "@/lib/dates";

// Spanish only, no locale in URLs (italian is prepared, not active: see docs/SPEC.md §13).
// Default export: next-intl loads this file by convention, like a Next.js special file.
export default getRequestConfig(async () => ({
  locale: "es",
  timeZone: MADRID_TIME_ZONE,
  messages: (await import("../../../messages/es.json")).default,
}));
