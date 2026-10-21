import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CONTRACT_CONFIG } from '../config/contract';

const CONTRACT_ADDRESS = CONTRACT_CONFIG.contractAddress;

function generatePrivateKey(): `0x${string}` {
  const bytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// Retrieve or generate a dedicated session account for gasless StudioNet execution
function getSessionAccount() {
  const STORAGE_KEY = 'genvest_session_signer_key';
  let privateKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

  if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
    privateKey = generatePrivateKey();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, privateKey);
    }
  }

  try {
    return createAccount(privateKey as `0x${string}`);
  } catch {
    const freshKey = generatePrivateKey();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, freshKey);
    }
    return createAccount(freshKey);
  }
}

export interface LiveTxResult {
  txHash: string;
  explorerUrl: string;
  methodName: string;
  status: 'SUBMITTED' | 'PROPOSING' | 'FINALIZED' | 'FAILED';
  receipt?: any;
  error?: string;
}

export type TxUpdateCallback = (result: LiveTxResult) => void;

class GenLayerService {
  private client: any;
  private account: any;

  constructor() {
    this.account = getSessionAccount();
    this.client = createClient({
      chain: studionet,
      account: this.account,
    });
  }

  public getSessionAddress(): string {
    return this.account.address;
  }

  /**
   * Broadcast a write transaction to GenLayer StudioNet and track consensus finality
   */
  public async sendTransaction(
    functionName: string,
    args: any[] = [],
    valueWei: bigint = 0n,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    const initialResult: LiveTxResult = {
      txHash: '',
      explorerUrl: '',
      methodName: functionName,
      status: 'SUBMITTED',
    };

    try {
      console.log(`[GenLayer] Sending ${functionName} transaction to ${CONTRACT_ADDRESS}...`);
      
      const txHash: string = await this.client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        value: valueWei,
        leaderOnly: false,
      });

      const explorerUrl = `https://explorer-studio.genlayer.com/tx/${txHash}`;
      const progressResult: LiveTxResult = {
        txHash,
        explorerUrl,
        methodName: functionName,
        status: 'PROPOSING',
      };

      if (onProgress) onProgress(progressResult);

      console.log(`[GenLayer] Tx broadcasted: ${txHash}. Awaiting multi-validator quorum...`);

      // Poll for finality
      const receipt = await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: 'FINALIZED',
        interval: 2000,
        retries: 45,
      });

      const finalResult: LiveTxResult = {
        txHash,
        explorerUrl,
        methodName: functionName,
        status: 'FINALIZED',
        receipt,
      };

      if (onProgress) onProgress(finalResult);
      return finalResult;
    } catch (error: any) {
      console.error(`[GenLayer] Transaction error for ${functionName}:`, error);
      const errorResult: LiveTxResult = {
        ...initialResult,
        status: 'FAILED',
        error: error?.message || 'Transaction failed on StudioNet',
      };
      if (onProgress) onProgress(errorResult);
      throw error;
    }
  }

  /**
   * Publish a New Climate Hedging Product on-chain
   */
  public async createProduct(
    productParams: any,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'create_product',
      [JSON.stringify(productParams)],
      0n,
      onProgress
    );
  }

  /**
   * Buy Coverage Policy on-chain
   */
  public async buyPolicy(
    productId: string,
    seasonStart: string,
    premiumWei: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'buy_policy',
      [productId, seasonStart],
      BigInt(premiumWei),
      onProgress
    );
  }

  /**
   * Fund Product Reserves on-chain
   */
  public async fundProduct(
    productId: string,
    amountWei: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'fund_product',
      [productId],
      BigInt(amountWei),
      onProgress
    );
  }

  /**
   * Autonomous Satellite Oracle Read on-chain
   */
  public async readIndex(
    policyId: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'read_index',
      [policyId],
      0n,
      onProgress
    );
  }

  /**
   * File Dispute Contest with 0.01 GEN bond on-chain
   */
  public async fileContest(
    policyId: string,
    statement: string,
    bondWei: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'contest',
      [policyId, statement],
      BigInt(bondWei),
      onProgress
    );
  }

  /**
   * Withdraw from Pull-Ledger on-chain
   */
  public async claimPayout(onProgress?: TxUpdateCallback): Promise<LiveTxResult> {
    return this.sendTransaction(
      'claim',
      [],
      0n,
      onProgress
    );
  }

  /**
   * Finalize Policy Settlement on-chain
   */
  public async finalizePolicy(
    policyId: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'finalize',
      [policyId],
      0n,
      onProgress
    );
  }

  /**
   * Read Live Protocol Stats on-chain
   */
  public async getStats(): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_stats',
      args: [],
    });
  }

  /**
   * Read Products List on-chain
   */
  public async listProducts(offset: number = 0, limit: number = 20): Promise<any[]> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'list_products',
      args: [offset, limit],
    });
  }
}

export const genlayerService = new GenLayerService();
