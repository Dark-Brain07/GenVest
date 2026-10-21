export type TriggerType = 'RAIN_BELOW' | 'RAIN_ABOVE';
export type WeatherSource = 'OPEN_METEO' | 'NASA_POWER';
export type PolicyState = 'ACTIVE' | 'READ' | 'CONTESTED' | 'DECIDED' | 'APPEALED' | 'SETTLED' | 'VOID';
export type VerdictType = 'STANDS' | 'USE_OTHER' | 'NO_RELIABLE_READING';

export interface Product {
  product_id: string;
  insurer: string;
  crop: string;
  region: string;
  lat: string;
  lon: string;
  trigger: TriggerType;
  threshold_tenths: number;
  window_days: number;
  premium_wei: string;
  payout_wei: string;
  capacity: number;
  sold_count: number;
  funded_wei: string;
  reserved_wei: string;
  primary: WeatherSource;
  backup: WeatherSource;
  dispute_clause: string;
  periods: {
    contest: number;
    response: number;
    appeal: number;
  };
  replay: boolean;
  replay_start?: string;
  active: boolean;
  created_at: string;
}

export interface WeatherReading {
  at: string;
  selected: WeatherSource;
  other: WeatherSource;
  triggered: boolean;
  series: Record<string, [string, number | null][]>;
  summaries: Record<string, {
    total_tenths: number;
    days_reported: number;
    days: number;
    complete: boolean;
    digest: string;
  }>;
  other_triggers: boolean | null;
}

export interface Policy {
  policy_id: string;
  product_id: string;
  farmer: string;
  insurer: string;
  crop: string;
  region: string;
  lat: string;
  lon: string;
  trigger: TriggerType;
  threshold_tenths: number;
  window_days: number;
  window_start: string;
  window_end: string;
  premium_wei: string;
  payout_wei: string;
  primary: WeatherSource;
  backup: WeatherSource;
  dispute_clause: string;
  periods: {
    contest: number;
    response: number;
    appeal: number;
  };
  replay: boolean;
  state: PolicyState;
  reserved: boolean;
  paid_to_farmer: boolean;
  round_count: number;
  bought_at: string;
  reading?: WeatherReading | null;
  contest?: {
    by: 'FARMER' | 'INSURER';
    statement: string;
    bond_wei: string;
    opened_at: string;
    response_ends: string;
    lapse_at: string;
    answer?: string | null;
    result?: 'MOVED' | 'HELD' | 'LAPSED';
  } | null;
  appeal?: {
    by: 'FARMER' | 'INSURER';
    statement: string;
    bond_wei: string;
    opened_at: string;
    response_ends: string;
    lapse_at: string;
    answer?: string | null;
    result?: 'MOVED' | 'HELD' | 'LAPSED';
  } | null;
  decision?: {
    verdict: VerdictType;
    outcome: boolean | null;
    round: number;
    against: string[];
  } | null;
  evidence_ids?: string[];
}

export interface EvidenceItem {
  evidence_id: string;
  policy_id: string;
  kind: 'PHOTO' | 'PAGE';
  by: 'FARMER' | 'INSURER';
  stage: 'CONTEST' | 'APPEAL';
  caption: string;
  url?: string;
  excerpt?: string;
  sha256: string;
  filed_at: string;
}

export interface ProtocolStats {
  product_count: number;
  policy_count: number;
  round_count: number;
  settled_count: number;
  paid_out_count: number;
  held_wei: string;
  paid_wei: string;
  evidence_count: number;
}
