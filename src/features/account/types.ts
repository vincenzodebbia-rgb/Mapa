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
 * A flagged organization for the founder's review (/revision). Only what admin_review_list returns:
 * never NIF, email, phone or user id (docs/PRIVACY_AND_OWNERSHIP.md §13).
 */
export type ReviewItem = {
  id: string;
  slug: string;
  name: string;
  entityType: ReviewEntityType | null;
  venueActivity: ReviewVenueActivity | null;
  neighborhoodName: string | null;
  /** Only http/https, otherwise null. */
  contactUrl: string | null;
  whatForWhom: string | null;
  howSustained: string | null;
  whatTheyOffer: string | null;
  flagReason: ReviewFlagReason | null;
  status: "active" | "suspended";
  createdAt: string;
};

/** Texts of the review list, read on the server. */
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
