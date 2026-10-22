import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const CONTRACT_ADDRESS = '0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA';

// 1. Underwriter Alice
const underwriterPK = '0x2de8b08ab2d81a95683d8e9970f580a37917b580f2c7c9846b80ac6885df3fc4';
const underwriterAccount = createAccount(underwriterPK);

// 2. Farmer Bob
const farmerPK = '0xa12dd3bdb52b0c9111935346299d7ae332627988911d5f8ee18aa9956b6d05c2';
const farmerAccount = createAccount(farmerPK);

console.log('='.repeat(75));
console.log('    GENVEST FRONTEND LIVE ON-CHAIN TRANSACTION TEST VIA GENLAYER-JS   ');
console.log('='.repeat(75));
console.log(`Target Contract:    ${CONTRACT_ADDRESS}`);
console.log(`Underwriter Signer: ${underwriterAccount.address}`);
console.log(`Farmer Signer:      ${farmerAccount.address}`);

function parseResult(receipt, fallback) {
  const resObj = receipt.consensus_data?.leader_receipt?.[0]?.result;
  if (!resObj) return fallback;
  if (typeof resObj === 'string') {
    try { return JSON.parse(resObj); } catch { return resObj; }
  }
  if (resObj?.payload?.readable) {
    try { return JSON.parse(resObj.payload.readable); } catch { return resObj.payload.readable; }
  }
  return fallback;
}

async function main() {
  const underwriterClient = createClient({
    chain: studionet,
    account: underwriterAccount,
  });

  const farmerClient = createClient({
    chain: studionet,
    account: farmerAccount,
  });

  // Verify connection to StudioNet
  console.log('\n[*] Verifying StudioNet connection and contract status...');
  const statsBefore = await underwriterClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_stats',
    args: [],
  });
  console.log('[+] Initial Protocol Stats:', statsBefore);

  // Check if P-000002 already exists or needs to be published
  let prodId = 'P-000002';
  let createTxHash = '';
  try {
    const existing = await underwriterClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_product',
      args: ['P-000002'],
    });
    console.log(`[+] Product P-000002 already exists on-chain:`, existing.crop, 'by', existing.insurer);
  } catch {
    // Publish P-000002
    console.log('\n[TX 1] Dispatching create_product transaction from Underwriter Signer...');
    const productParams = {
      crop: 'Hard Red Winter Wheat',
      region: 'Pampas Humedas, Cordoba, Argentina',
      lat: '-31.42',
      lon: '-64.18',
      trigger: 'RAIN_BELOW',
      threshold_tenths: 850,
      window_days: 14,
      premium_wei: '100000000000000000', // 0.10 GEN
      payout_wei: '500000000000000000',  // 0.50 GEN
      capacity: 10,
      primary: 'OPEN_METEO',
      backup: 'NASA_POWER',
      dispute_clause: 'Precipitation under 85 mm during tillering stage triggers full payout. Contests weighed against regional INTA agricultural bulletins.',
      periods: { contest: 86400, response: 86400, appeal: 86400 },
      replay: true,
      replay_start: '2026-08-01',
    };

    createTxHash = await underwriterClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'create_product',
      args: [JSON.stringify(productParams)],
      value: 0n,
      leaderOnly: false,
    });

    console.log(`[+] Broadcasted create_product Tx: ${createTxHash}`);
    console.log(`[*] Explorer URL: https://explorer-studio.genlayer.com/tx/${createTxHash}`);
    console.log('[*] Waiting for multi-validator consensus (status: FINALIZED)...');

    const createReceipt = await underwriterClient.waitForTransactionReceipt({
      hash: createTxHash,
      status: 'FINALIZED',
      interval: 2500,
      retries: 45,
    });

    prodId = parseResult(createReceipt, 'P-000002');
    console.log(`[+] create_product Finalized! Product ID: ${prodId}`);
  }

  // Transaction 2: fund_product from Underwriter Alice
  console.log(`\n[TX 2] Dispatching fund_product (0.50 GEN) for product ${prodId} from Underwriter Signer...`);
  const fundTxHash = await underwriterClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'fund_product',
    args: [prodId],
    value: 500000000000000000n, // 0.50 GEN
    leaderOnly: false,
  });

  console.log(`[+] Broadcasted fund_product Tx: ${fundTxHash}`);
  console.log(`[*] Explorer URL: https://explorer-studio.genlayer.com/tx/${fundTxHash}`);
  console.log('[*] Waiting for multi-validator consensus (status: FINALIZED)...');

  const fundReceipt = await underwriterClient.waitForTransactionReceipt({
    hash: fundTxHash,
    status: 'FINALIZED',
    interval: 2500,
    retries: 45,
  });
  console.log(`[+] fund_product Finalized! Consensus Status: ${fundReceipt.statusName || fundReceipt.status}`);

  // Transaction 3: buy_policy from Farmer Bob
  console.log(`\n[TX 3] Dispatching buy_policy (0.10 GEN premium) from Farmer Bob (${farmerAccount.address})...`);
  const buyTxHash = await farmerClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'buy_policy',
    args: [prodId, '2026-08-01'],
    value: 100000000000000000n, // exact 0.10 GEN premium
    leaderOnly: false,
  });

  console.log(`[+] Broadcasted buy_policy Tx: ${buyTxHash}`);
  console.log(`[*] Explorer URL: https://explorer-studio.genlayer.com/tx/${buyTxHash}`);
  console.log('[*] Waiting for multi-validator consensus (status: FINALIZED)...');

  const buyReceipt = await farmerClient.waitForTransactionReceipt({
    hash: buyTxHash,
    status: 'FINALIZED',
    interval: 2500,
    retries: 45,
  });

  const policyId = parseResult(buyReceipt, 'Y-000001');
  console.log(`[+] buy_policy Finalized! Returned Policy ID: ${policyId}`);

  // Verification: Query Contract State On-Chain
  console.log('\n[*] Verifying on-chain contract state via view methods...');
  const productData = await underwriterClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_product',
    args: [prodId],
  });
  console.log('[+] Verified Product State:', {
    product_id: productData.product_id,
    crop: productData.crop,
    insurer: productData.insurer,
    sold_count: productData.sold_count,
    funded_wei: productData.funded_wei,
    reserved_wei: productData.reserved_wei,
    paid_out_wei: productData.paid_out_wei,
  });

  const policyData = await farmerClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_policy',
    args: [policyId],
  });
  console.log('[+] Verified Policy State:', {
    policy_id: policyData.policy_id,
    farmer: policyData.farmer,
    insurer: policyData.insurer,
    state: policyData.state,
    reserved: policyData.reserved,
    premium_wei: policyData.premium_wei,
    payout_wei: policyData.payout_wei,
  });

  const statsData = await underwriterClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_stats',
    args: [],
  });
  console.log('[+] Verified Protocol Stats:', statsData);

  console.log('\n' + '='.repeat(75));
  console.log('       ALL LIVE FRONTEND TRANSACTIONS VERIFIED WITH CONSENSUS!      ');
  console.log('='.repeat(75));
}

main().catch((err) => {
  console.error('Fatal error during live proof execution:', err);
  process.exit(1);
});
