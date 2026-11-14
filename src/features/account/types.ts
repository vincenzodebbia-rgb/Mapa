/** Stato del modulo "Eliminar cuenta". */
export type DeleteAccountError = "wrongWord" | "tooMany" | "failed";
export type DeleteAccountState = { attempt: number; error: DeleteAccountError | null };
export const INITIAL_DELETE_ACCOUNT_STATE: DeleteAccountState = { attempt: 0, error: null };

export type DeleteAccountTexts = {
  confirmLabel: string;
  button: string;
  sending: string;
  errors: Record<DeleteAccountError, string>;
};

export type ReviewEntityType = "association" | "foundation" | "cooperative" | "public_entity" | "commercial" | "informal";
export type ReviewFlagReason = "not_in_registry" | "public_entity" | "no_nif" | "doubtful_activity";
export type ReviewVenueActivity =
  | "libreria"
  | "sala_pequena"
  | "centro_cultural"
  | "galeria"
  | "taller_estudio"
  | "cafe_cultural"
  | "discoteca_club"
  | "bar_nocturno"
  | "otro";

/**
 * Un'organizzazione con avviso per la revisione del fondatore (/revision). Solo ciò che restituisce admin_review_list:
 * mai NIF, email, telefono o id utente (docs/PRIVACY_AND_OWNERSHIP.md §13).
 */
export type ReviewItem = {
  id: string;
  slug: string;
  name: string;
  entityType: ReviewEntityType | null;
  venueActivity: ReviewVenueActivity | null;
  neighborhoodName: string | null;
  /** Solo http/https, altrimenti null. */
  contactUrl: string | null;
  whatForWhom: string | null;
  howSustained: string | null;
  whatTheyOffer: string | null;
  flagReason: ReviewFlagReason | null;
  status: "active" | "suspended";
  createdAt: string;
};

/** Testi dell'elenco di revisione, letti sul server. */
export type ReviewListTexts = {
  empty: string;
  none: string;
  createdLabel: (date: string) => string;
  fields: Record<
    "type" | "activity" | "neighborhood" | "web" | "whatForWhom" | "howSustained" | "whatTheyOffer" | "reason" | "status" | "profile",
    string
  >;
  entityTypes: Record<ReviewEntityType, string>;
  reasons: Record<ReviewFlagReason, string>;
  activities: Record<ReviewVenueActivity, string>;
  statuses: Record<ReviewItem["status"], string>;
};
