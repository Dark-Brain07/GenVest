import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CONTRACT_CONFIG } from '../config/contract';

const CONTRACT_ADDRESS = CONTRACT_CONFIG.contractAddress;

// Pre-configured deterministic role accounts for seamless testing & demonstration
export const ROLE_ACCOUNTS = {
  UNDERWRITER: {
    label: 'Alice (Underwriter)',
    role: 'Underwriter / Insurer',
    privateKey: '0x2de8b08ab2d81a95683d8e9970f580a37917b580f2c7c9846b80ac6885df3fc4' as `0x${string}`,
    address: '0xAfc40A8D303e15e3D80572c530Bb0AD3f669e609',
  },
  FARMER: {
    label: 'Bob (Maize Producer)',
    role: 'Beneficiary Farmer',
    privateKey: '0xa12dd3bdb52b0c9111935346299d7ae332627988911d5f8ee18aa9956b6d05c2' as `0x${string}`,
    address: '0xd055e95b0f06B87Fdcc9938076F52c17A34781Ad',
  },
};

export interface LiveTxResult {
  txHash: string;
  explorerUrl: string;
  methodName: string;
  status: 'SUBMITTED' | 'PROPOSING' | 'FINALIZED' | 'FAILED';
  receipt?: any;
  returnValue?: any;
  error?: string;
}

export type TxUpdateCallback = (result: LiveTxResult) => void;

class GenLayerService {
  private client: any;
  private sessionAccount: any;
  private sessionPrivateKey: string = '';
  private isInjectedMode: boolean = false;
  private injectedAddress: string = '';
  private injectedProvider: any = null;

  constructor() {
    this.initSessionAccount();
    this.buildClient();
  }

  private initSessionAccount() {
    const STORAGE_KEY = 'genvest_session_signer_key';
    let pk = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!pk || !pk.startsWith('0x') || pk.length !== 66) {
      // Default to Alice underwriter for clean first impression
      pk = ROLE_ACCOUNTS.UNDERWRITER.privateKey;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, pk);
      }
    }
    this.sessionPrivateKey = pk;
    try {
      this.sessionAccount = createAccount(pk as `0x${string}`);
    } catch {
      const freshKey = generatePrivateKey();
      this.sessionPrivateKey = freshKey;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, freshKey);
      }
      this.sessionAccount = createAccount(freshKey);
    }
  }

  private buildClient() {
    if (this.isInjectedMode && this.injectedProvider && this.injectedAddress) {
      this.client = createClient({
        chain: studionet,
        provider: this.injectedProvider,
        account: this.injectedAddress as `0x${string}`,
      });
    } else {
      this.client = createClient({
        chain: studionet,
        account: this.sessionAccount,
      });
    }
  }

  /**
   * The displayed address in the UI is GUARANTEED to be this exact signer address
   */
  public getSignerAddress(): string {
    if (this.isInjectedMode && this.injectedAddress) {
      return this.injectedAddress;
    }
    return this.sessionAccount?.address || '';
  }

  public getSessionPrivateKey(): string {
    return this.sessionPrivateKey;
  }

  public setSessionPrivateKey(pk: string): string {
    let normalized = pk.trim();
    if (!normalized.startsWith('0x')) normalized = `0x${normalized}`;
    this.sessionPrivateKey = normalized;
    this.sessionAccount = createAccount(normalized as `0x${string}`);
    this.isInjectedMode = false;
    this.injectedProvider = null;
    this.injectedAddress = '';
    if (typeof window !== 'undefined') {
      localStorage.setItem('genvest_session_signer_key', normalized);
      localStorage.setItem('genvest_wallet_address', this.sessionAccount.address);
    }
    this.buildClient();
    return this.sessionAccount.address;
  }

  public setInjectedSigner(provider: any, address: string) {
    this.isInjectedMode = true;
    this.injectedProvider = provider;
    this.injectedAddress = address;
    this.buildClient();
  }

  public disconnectInjected(): string {
    this.isInjectedMode = false;
    this.injectedProvider = null;
    this.injectedAddress = '';
    this.buildClient();
    return this.sessionAccount.address;
  }

  /**
   * Execute real on-chain write transaction and wait for multi-validator consensus
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
      console.log(`[GenLayer] Sending ${functionName} from ${this.getSignerAddress()} to ${CONTRACT_ADDRESS}...`);

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

      // Verify that the transaction actually succeeded and was not an execution error
      const leaderReceipt = receipt?.consensus_data?.leader_receipt?.[0];
      const execError = leaderReceipt?.error || receipt?.error;
      const resObj = leaderReceipt?.result;
      const isFailedExec = 
        receipt?.txExecutionResult === 1 || 
        receipt?.txExecutionResult === 2 || 
        receipt?.resultName === 'ERROR' ||
        resObj?.status === 'error' ||
        Boolean(leaderReceipt?.genvm_result?.error_description) ||
        Boolean(execError);

      if (isFailedExec) {
        const errorMsg = 
          leaderReceipt?.genvm_result?.error_description || 
          resObj?.payload?.readable || 
          execError || 
          'Transaction rejected by GenVM smart contract rules';
        console.error(`[GenLayer] On-chain execution failed for ${functionName}:`, errorMsg);
        const failedResult: LiveTxResult = {
          txHash,
          explorerUrl,
          methodName: functionName,
          status: 'FAILED',
          receipt,
          error: errorMsg,
        };
        if (onProgress) onProgress(failedResult);
        throw new Error(errorMsg);
      }

      // Extract returned value from leader receipt payload
      let returnValue: any = undefined;
      if (typeof resObj === 'string') {
        try {
          returnValue = JSON.parse(resObj);
        } catch {
          returnValue = resObj;
        }
      } else if (resObj?.payload?.readable) {
        try {
          returnValue = JSON.parse(resObj.payload.readable);
        } catch {
          returnValue = resObj.payload.readable;
        }
      }

      const finalResult: LiveTxResult = {
        txHash,
        explorerUrl,
        methodName: functionName,
        status: 'FINALIZED',
        receipt,
        returnValue,
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

  // ── Write Contract Methods ───────────────────────────────────────────────────

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

  public async withdrawCapital(
    productId: string,
    amountWei: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'withdraw_capital',
      [productId, BigInt(amountWei)],
      0n,
      onProgress
    );
  }

  public async closeProduct(
    productId: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'close_product',
      [productId],
      0n,
      onProgress
    );
  }

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

  public async contest(
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

  public async answer(
    policyId: string,
    statement: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'answer',
      [policyId, statement],
      0n,
      onProgress
    );
  }

  public async filePhoto(
    policyId: string,
    caption: string,
    imageBytes: Uint8Array,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'file_photo',
      [policyId, caption, imageBytes],
      0n,
      onProgress
    );
  }

  public async filePage(
    policyId: string,
    caption: string,
    url: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'file_page',
      [policyId, caption, url],
      0n,
      onProgress
    );
  }

  public async decideContest(
    policyId: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'decide_contest',
      [policyId],
      0n,
      onProgress
    );
  }

  public async appeal(
    policyId: string,
    statement: string,
    bondWei: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'appeal',
      [policyId, statement],
      BigInt(bondWei),
      onProgress
    );
  }

  public async decideAppeal(
    policyId: string,
    onProgress?: TxUpdateCallback
  ): Promise<LiveTxResult> {
    return this.sendTransaction(
      'decide_appeal',
      [policyId],
      0n,
      onProgress
    );
  }

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

  public async claimPayout(onProgress?: TxUpdateCallback): Promise<LiveTxResult> {
    return this.sendTransaction(
      'claim',
      [],
      0n,
      onProgress
    );
  }

  // ── Read Contract Methods ───────────────────────────────────────────────────

  public async getStats(): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_stats',
      args: [],
    });
  }

  public async getConfig(): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_config',
      args: [],
    });
  }

  public async listProducts(offset: number = 0, limit: number = 50): Promise<any[]> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'list_products',
      args: [offset, limit],
    });
  }

  public async listPolicies(offset: number = 0, limit: number = 50): Promise<any[]> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'list_policies',
      args: [offset, limit],
    });
  }

  public async getProduct(productId: string): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_product',
      args: [productId],
    });
  }

  public async getPolicy(policyId: string): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_policy',
      args: [policyId],
    });
  }

  public async getEvidence(policyId: string): Promise<any[]> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_evidence',
      args: [policyId],
    });
  }

  public async getBalance(account: string): Promise<any> {
    return this.client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_balance',
      args: [account],
    });
  }
}

export const genlayerService = new GenLayerService();
