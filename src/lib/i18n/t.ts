import "server-only";
import messages from "../../../messages/es.json";
import { interpolateMessage, lookupMessage, type MessageKey, type MessageValues } from "./format";

// Solo spagnolo, nessuna lingua negli URL (docs/adr/0008-i18n-senza-next-intl.md).
// Solo server: i componenti client ricevono i loro testi come props dalla pagina sul server.

export type TranslationKey = MessageKey<typeof messages>;

export function t(key: TranslationKey, values?: MessageValues): string {
  return interpolateMessage(lookupMessage(messages, key), values);
}
