export type ManaColor = "W" | "U" | "B" | "R" | "G";

export interface ScryfallCardFace {
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: ManaColor[];
  power?: string | null;
  toughness?: string | null;
  loyalty?: string | null;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
}

export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  lang: string;
  layout: string;
  card_faces?: ScryfallCardFace[];
  mana_cost?: string;
  cmc: number;
  colors?: ManaColor[];
  color_identity: ManaColor[];
  type_line: string;
  oracle_text?: string;
  keywords?: string[];
  power?: string | null;
  toughness?: string | null;
  loyalty?: string | null;
  produced_mana?: ManaColor[];
  legalities?: {
    standard?: string;
    future?: string;
    [key: string]: string | undefined;
  };
  set: string;
  set_name: string;
  set_type?: string;
  collector_number?: string;
  rarity?: string;
  released_at?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    eur?: string | null;
  };
  edhrec_rank?: number | null;
  game_changer?: boolean;
  flavor_text?: string;
  artist?: string;
}

export interface CardRecord {
  id: string;
  oracleId: string;
  name: string;
  lang: string;
  layout: string;
  cardFacesJson: string | null;
  manaCost: string | null;
  cmc: number;
  colorsJson: string;
  colorIdentityJson: string;
  typeLine: string;
  oracleText: string | null;
  keywordsJson: string;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  producedManaJson: string;
  legalityStandard: string | null;
  legalityFuture: string | null;
  bannedInStandard: number;
  setCode: string;
  setName: string;
  setType: string | null;
  collectorNumber: string | null;
  rarity: string | null;
  releasedAt: string | null;
  imageNormal: string | null;
  priceUsd: number | null;
  priceUsdFoil: number | null;
  priceEur: number | null;
  edhrecRank: number | null;
  gameChanger: number;
  flavorText: string | null;
  artist: string | null;
  searchText: string;
  importedAt: string;
}

export interface SetRecord {
  code: string;
  name: string;
  releaseDate: string | null;
  setType: string | null;
  importedAt: string;
}

export interface ImportProgress {
  phase: "reading" | "parsing" | "transforming" | "saving" | "done" | "error";
  percent: number;
  processed: number;
  total: number;
  message: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  totalSeen: number;
  setsExtracted: number;
  timestamp: string;
}

export interface DatabaseStatus {
  cardCount: number;
  setCount: number;
  lastImportedAt: string | null;
  isStale: boolean;
  isEmpty: boolean;
}

export interface ScryfallBulkDataEntry {
  object: string;
  id: string;
  type: string;
  name: string;
  uri: string;
  download_uri: string;
  updated_at: string;
  size: number;
  content_type: string;
  content_encoding: string;
}
