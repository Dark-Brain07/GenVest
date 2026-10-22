import React, { createContext, useContext, useState, useEffect } from 'react';
import { genlayerService, ROLE_ACCOUNTS } from '../services/genlayerService';

export const STUDIO_NET_CONFIG = {
  chainId: '0xF22F', // 61999 in hex
  chainIdDecimal: 61999,
  chainName: 'GenLayer StudioNet',
  nativeCurrency: {
    name: 'GEN',
    symbol: 'GEN',
    decimals: 18,
  },
  rpcUrls: ['https://studio.genlayer.com/api'],
  blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
};

export interface WalletContextType {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  balanceGen: string;
  chainId: number | null;
  isCorrectNetwork: boolean;
  walletName: string;
  hasInjectedWallet: boolean;
  activeRole: 'UNDERWRITER' | 'FARMER' | 'CUSTOM' | 'INJECTED';
  connectInjected: () => Promise<void>;
  connectRoleAccount: (role: 'UNDERWRITER' | 'FARMER') => void;
  connectCustomKey: (privateKey: string) => void;
  connectSimulated: (address: string, label: string) => void;
  disconnect: () => void;
  switchToStudioNet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITICAL: The displayed application wallet address is ALWAYS derived from the actual transaction signer!
  const [address, setAddress] = useState<string>(() => {
    return genlayerService.getSignerAddress();
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [balanceGen, setBalanceGen] = useState<string>('10.000');
  const [chainId, setChainId] = useState<number | null>(61999);
  const [activeRole, setActiveRole] = useState<'UNDERWRITER' | 'FARMER' | 'CUSTOM' | 'INJECTED'>('UNDERWRITER');
  const [walletName, setWalletName] = useState<string>(() => {
    const signer = genlayerService.getSignerAddress().toLowerCase();
    if (signer === ROLE_ACCOUNTS.UNDERWRITER.address.toLowerCase()) return ROLE_ACCOUNTS.UNDERWRITER.label;
    if (signer === ROLE_ACCOUNTS.FARMER.address.toLowerCase()) return ROLE_ACCOUNTS.FARMER.label;
    return 'StudioNet Session Signer';
  });
  const [error, setError] = useState<string | null>(null);

  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
  const hasInjectedWallet = Boolean(ethereum);

  const fetchBalance = async (accAddress: string) => {
    if (!accAddress) return;
    try {
      if (ethereum && activeRole === 'INJECTED') {
        const balHex = await ethereum.request({
          method: 'eth_getBalance',
          params: [accAddress, 'latest'],
        });
        const balWei = BigInt(balHex);
        const bal = (Number(balWei) / 1e18).toFixed(3);
        setBalanceGen(bal);
      } else {
        // Query contract ledger balance for session account
        const ledger = await genlayerService.getBalance(accAddress);
        const claimable = BigInt(ledger?.claimable_wei || '0');
        const claimed = BigInt(ledger?.claimed_wei || '0');
        const displayBal = (Number(claimable + claimed) / 1e18 + 10.0).toFixed(3);
        setBalanceGen(displayBal);
      }
    } catch {
      setBalanceGen('10.000');
    }
  };

  const refreshBalances = async () => {
    await fetchBalance(address);
  };

  const checkNetwork = async () => {
    if (!ethereum) return;
    try {
      const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(currentChainHex, 16);
      setChainId(currentChainId);
    } catch (err) {
      console.warn('Failed to fetch chainId:', err);
    }
  };

  useEffect(() => {
    if (ethereum && activeRole === 'INJECTED') {
      checkNetwork();

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          const primary = accounts[0];
          genlayerService.setInjectedSigner(ethereum, primary);
          setAddress(primary);
          setIsConnected(true);
          fetchBalance(primary);
        }
      };

      const handleChainChanged = (newChainHex: string) => {
        setChainId(parseInt(newChainHex, 16));
      };

      ethereum.on?.('accountsChanged', handleAccountsChanged);
      ethereum.on?.('chainChanged', handleChainChanged);

      return () => {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
        ethereum.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, [ethereum, activeRole]);

  useEffect(() => {
    fetchBalance(address);
  }, [address]);

  // Connect Injected Browser Wallet (MetaMask, Rabby, etc.)
  const connectInjected = async () => {
    setError(null);
    if (!ethereum) {
      setError('No browser Web3 wallet detected. Please install MetaMask, Rabby, or Coinbase Wallet.');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const primary = accounts[0];
        // Ensure genlayer-js signs with this exact address via injected provider
        genlayerService.setInjectedSigner(ethereum, primary);

        setAddress(primary);
        setIsConnected(true);
        setActiveRole('INJECTED');

        let detectedName = 'Browser Wallet';
        if (ethereum.isMetaMask) detectedName = 'MetaMask';
        else if (ethereum.isRabby) detectedName = 'Rabby Wallet';
        else if (ethereum.isCoinbaseWallet) detectedName = 'Coinbase Wallet';

        setWalletName(detectedName);
        localStorage.setItem('genvest_wallet_address', primary);
        localStorage.setItem('genvest_is_connected', 'true');
        localStorage.setItem('genvest_wallet_name', detectedName);

        await checkNetwork();
        await fetchBalance(primary);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Switch between pre-configured role accounts (Alice Underwriter or Bob Farmer)
  const connectRoleAccount = (role: 'UNDERWRITER' | 'FARMER') => {
    const roleConfig = ROLE_ACCOUNTS[role];
    const newAddr = genlayerService.setSessionPrivateKey(roleConfig.privateKey);
    setAddress(newAddr);
    setIsConnected(true);
    setActiveRole(role);
    setWalletName(roleConfig.label);
    setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
    fetchBalance(newAddr);
  };

  // Connect via custom private key
  const connectCustomKey = (privateKey: string) => {
    try {
      const newAddr = genlayerService.setSessionPrivateKey(privateKey);
      setAddress(newAddr);
      setIsConnected(true);
      setActiveRole('CUSTOM');
      setWalletName(`Custom Account (${newAddr.slice(0, 6)}...${newAddr.slice(-4)})`);
      setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
      fetchBalance(newAddr);
    } catch (err: any) {
      setError(err?.message || 'Invalid private key format');
    }
  };

  // Compatibility helper
  const connectSimulated = (_simAddress: string, label: string) => {
    if (label.toLowerCase().includes('bob') || label.toLowerCase().includes('farmer')) {
      connectRoleAccount('FARMER');
    } else {
      connectRoleAccount('UNDERWRITER');
    }
  };

  const disconnect = () => {
    const fallbackAddr = genlayerService.disconnectInjected();
    setIsConnected(true);
    setAddress(fallbackAddr);
    setActiveRole('UNDERWRITER');
    setWalletName('Alice (Underwriter)');
    fetchBalance(fallbackAddr);
  };

  const switchToStudioNet = async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIO_NET_CONFIG.chainId }],
      });
      setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [STUDIO_NET_CONFIG],
          });
          setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
        } catch (addError: any) {
          setError(addError?.message || 'Failed to add GenLayer StudioNet to wallet');
        }
      } else {
        setError(switchError?.message || 'Failed to switch network');
      }
    }
  };

  const isCorrectNetwork = chainId === STUDIO_NET_CONFIG.chainIdDecimal || chainId === null;

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        balanceGen,
        chainId,
        isCorrectNetwork,
        walletName,
        hasInjectedWallet,
        activeRole,
        connectInjected,
        connectRoleAccount,
        connectCustomKey,
        connectSimulated,
        disconnect,
        switchToStudioNet,
        refreshBalances,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWeb3Wallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWeb3Wallet must be used within a WalletProvider');
  }
  return context;
};
