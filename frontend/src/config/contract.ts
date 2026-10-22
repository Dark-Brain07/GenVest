export const CONTRACT_CONFIG = {
  network: 'GenLayer StudioNet',
  chainId: 61999,
  rpcUrl: 'https://studio.genlayer.com/api',
  contractAddress: '0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA',
  deployTxHash: '0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912',
  explorerContractUrl: 'https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA',
  explorerTxUrl: 'https://explorer-studio.genlayer.com/tx/0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912',
  flagshipProductId: 'P-000001',
  createProductTxHash: '0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb',
  fundProductTxHash: '0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc',
  runnerPin: 'py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6',
};

export const INITIAL_PRODUCTS = [
  {
    product_id: 'P-000001',
    insurer: '0x1E878a57ce79073a3A44640f1C92C362E7e8492d',
    crop: 'Maize (Zea mays)',
    region: 'Federal Capital Territory, Abuja, Nigeria',
    lat: '9.06',
    lon: '7.49',
    trigger: 'RAIN_BELOW' as const,
    threshold_tenths: 1400, // 140.0 mm
    window_days: 14,
    premium_wei: '100000000000000000', // 0.10 GEN
    payout_wei: '500000000000000000',  // 0.50 GEN
    capacity: 20,
    sold_count: 3,
    funded_wei: '200000000000000000',  // 0.20 GEN
    reserved_wei: '1500000000000000000', // 1.50 GEN
    primary: 'OPEN_METEO' as const,
    backup: 'NASA_POWER' as const,
    dispute_clause: 'If ERA5 and MERRA-2 disagree on drought threshold, local field photographs and official meteorological reports decide which reading governs.',
    periods: {
      contest: 86400,
      response: 86400,
      appeal: 86400,
    },
    replay: true,
    replay_start: '2026-08-01',
    active: true,
    created_at: '2026-10-21T03:43:00Z',
  },
  {
    product_id: 'P-000002',
    insurer: '0x3252f04b1923B6fe4e53396f1FC80A0Db1CB3C17',
    crop: 'Hard Red Winter Wheat',
    region: 'Pampas Humedas, Cordoba, Argentina',
    lat: '-31.42',
    lon: '-64.18',
    trigger: 'RAIN_BELOW' as const,
    threshold_tenths: 850, // 85.0 mm
    window_days: 21,
    premium_wei: '150000000000000000', // 0.15 GEN
    payout_wei: '800000000000000000',  // 0.80 GEN
    capacity: 15,
    sold_count: 5,
    funded_wei: '5000000000000000000',
    reserved_wei: '4000000000000000000',
    primary: 'OPEN_METEO' as const,
    backup: 'NASA_POWER' as const,
    dispute_clause: 'Precipitation under 85 mm during tillering stage triggers full payout. Contests weighed against regional INTA agricultural bulletins.',
    periods: {
      contest: 86400,
      response: 86400,
      appeal: 86400,
    },
    replay: false,
    active: true,
    created_at: '2026-10-21T02:15:00Z',
  },
  {
    product_id: 'P-000003',
    insurer: '0xeb9ad7d911c12cd4c4f85b655d4d6a416ed74640',
    crop: 'Basmati Rice (Oryza sativa)',
    region: 'Punjab Rice Belt, Amritsar, India',
    lat: '31.63',
    lon: '74.87',
    trigger: 'RAIN_ABOVE' as const,
    threshold_tenths: 3200, // 320.0 mm (Excess Monsoon Flash Flood)
    window_days: 10,
    premium_wei: '200000000000000000', // 0.20 GEN
    payout_wei: '1200000000000000000', // 1.20 GEN
    capacity: 25,
    sold_count: 8,
    funded_wei: '12000000000000000000',
    reserved_wei: '9600000000000000000',
    primary: 'OPEN_METEO' as const,
    backup: 'NASA_POWER' as const,
    dispute_clause: 'Excess precipitation over 320 mm causing field inundation triggers flood compensation. Satellite radar imagery governs in dispute.',
    periods: {
      contest: 86400,
      response: 86400,
      appeal: 86400,
    },
    replay: false,
    active: true,
    created_at: '2026-10-20T18:30:00Z',
  },
  {
    product_id: 'P-000004',
    insurer: '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5',
    crop: 'Arabica Specialty Coffee',
    region: 'Central Highlands, Kiambu, Kenya',
    lat: '-1.17',
    lon: '36.83',
    trigger: 'RAIN_BELOW' as const,
    threshold_tenths: 950, // 95.0 mm (Flowering Stage Drought)
    window_days: 30,
    premium_wei: '250000000000000000', // 0.25 GEN
    payout_wei: '1500000000000000000', // 1.50 GEN
    capacity: 12,
    sold_count: 2,
    funded_wei: '4000000000000000000',
    reserved_wei: '3000000000000000000',
    primary: 'OPEN_METEO' as const,
    backup: 'NASA_POWER' as const,
    dispute_clause: 'Flowering drought verified via canopy wilt photography and KMD agro-meteorological bulletins.',
    periods: {
      contest: 86400,
      response: 86400,
      appeal: 86400,
    },
    replay: false,
    active: true,
    created_at: '2026-10-21T01:10:00Z',
  },
];
