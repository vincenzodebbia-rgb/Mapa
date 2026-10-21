import "server-only";
import messages from "../../../messages/es.json";
import { interpolateMessage, lookupMessage, type MessageKey, type MessageValues } from "./format";

// Spanish only, no locale in URLs (docs/adr/0008-i18n-senza-next-intl.md).
// Server only: client components receive their texts as props from the server page.

export type TranslationKey = MessageKey<typeof messages>;

export function t(key: TranslationKey, values?: MessageValues): string {
  return interpolateMessage(lookupMessage(messages, key), values);
}
