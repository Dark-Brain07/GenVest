import React, { createContext, useContext, useState, useEffect } from 'react';

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
  connectInjected: () => Promise<void>;
  connectSimulated: (address: string, label: string) => void;
  disconnect: () => void;
  switchToStudioNet: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Default address (Alice underwriter for preview)
const DEFAULT_PREVIEW_ADDRESS = '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string>(() => {
    return localStorage.getItem('genvest_wallet_address') || DEFAULT_PREVIEW_ADDRESS;
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return localStorage.getItem('genvest_is_connected') === 'true';
  });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [balanceGen, setBalanceGen] = useState<string>('12.50');
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletName, setWalletName] = useState<string>(() => {
    return localStorage.getItem('genvest_wallet_name') || 'Simulated Underwriter';
  });
  const [error, setError] = useState<string | null>(null);

  const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
  const hasInjectedWallet = Boolean(ethereum);

  const fetchBalance = async (accAddress: string) => {
    if (ethereum && isConnected && walletName !== 'Simulated Underwriter' && !walletName.startsWith('Simulated')) {
      try {
        const balHex = await ethereum.request({
          method: 'eth_getBalance',
          params: [accAddress, 'latest'],
        });
        const balWei = BigInt(balHex);
        const bal = (Number(balWei) / 1e18).toFixed(3);
        setBalanceGen(bal);
      } catch {
        setBalanceGen('0.000');
      }
    }
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
    if (ethereum) {
      checkNetwork();

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          setIsConnected(true);
          localStorage.setItem('genvest_wallet_address', accounts[0]);
          localStorage.setItem('genvest_is_connected', 'true');
          fetchBalance(accounts[0]);
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
  }, [ethereum]);

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
        setAddress(primary);
        setIsConnected(true);

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

  const switchToStudioNet = async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIO_NET_CONFIG.chainId }],
      });
      setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
    } catch (switchError: any) {
      // Error code 4902 indicates that the chain has not been added to MetaMask
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

  const connectSimulated = (simAddress: string, label: string) => {
    setAddress(simAddress);
    setIsConnected(true);
    setWalletName(`Simulated (${label})`);
    setChainId(STUDIO_NET_CONFIG.chainIdDecimal);
    setBalanceGen('25.000');
    localStorage.setItem('genvest_wallet_address', simAddress);
    localStorage.setItem('genvest_is_connected', 'true');
    localStorage.setItem('genvest_wallet_name', `Simulated (${label})`);
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(DEFAULT_PREVIEW_ADDRESS);
    setWalletName('Disconnected');
    setBalanceGen('0.000');
    localStorage.removeItem('genvest_wallet_address');
    localStorage.removeItem('genvest_is_connected');
    localStorage.removeItem('genvest_wallet_name');
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
        connectInjected,
        connectSimulated,
        disconnect,
        switchToStudioNet,
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
