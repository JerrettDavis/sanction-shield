export type SanctionsSource = "ofac_sdn" | "eu_consolidated" | "un_security_council";
export type EntityType = "individual" | "organization" | "vessel" | "aircraft" | "other";

export interface SanctionsEntry {
  externalId: string;
  source: SanctionsSource;
  entryType: EntityType;
  primaryName: string;
  aliases: string[];
  programs: string[];
  addresses: Array<{
    address?: string;
    city?: string;
    stateOrProvince?: string;
    postalCode?: string;
    country?: string;
  }>;
  identification: Array<{
    type: string;
    value: string;
    country?: string;
  }>;
  remarks?: string;
}

export interface ScreeningMatch {
  confidence: number;
  band: "HIGH" | "REVIEW" | "LOW";
  requires_review: boolean;
  component_scores: {
    trigram: number;
    levenshtein: number;
    phonetic: number;
    token_overlap: number;
  };
  list: SanctionsSource;
  entry: {
    sdn_id: string;
    entry_type: EntityType;
    primary_name: string;
    aliases: string[];
    programs: string[];
    addresses: SanctionsEntry["addresses"];
    ids: SanctionsEntry["identification"];
    remarks?: string;
  };
}

export interface ScreeningResponse {
  screened_at: string;
  input: {
    name: string;
    entity_type: EntityType | "any";
    threshold: number;
  };
  matches: ScreeningMatch[];
  list_versions: Record<SanctionsSource, string | null>;
  request_id: string;
}
