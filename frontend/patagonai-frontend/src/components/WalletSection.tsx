import { useActiveAccount } from "thirdweb/react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import { useState, useEffect } from "react";

// Get USDC contract instance
const usdcContract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_USDC_CONTRACT!,
  chain: baseSepolia,
});

export default function WalletSection() {
  const account = useActiveAccount();
  const [balance, setBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);

  // Format address to show first 4 and last 4 characters
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy full address to clipboard
  const copyAddress = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  // Fetch balance when account changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (account?.address) {
        try {
          const balance = await readContract({
            contract: usdcContract,
            method: "function balanceOf(address account) view returns (uint256)",
            params: [account.address],
          });
          
          // Convert from wei (6 decimals for USDC)
          const formattedBalance = (Number(balance) / 1_000_000).toFixed(2);
          setBalance(formattedBalance);
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
    };

    fetchBalance();
  }, [account?.address]);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-md font-bold">
              {account?.address ? 'Your connected wallet: ' + formatAddress(account.address) : 'No wallet connected'}
            </h3>
            {account?.address && (
              <button
                onClick={copyAddress}
                className="btn btn-ghost btn-xs"
                title={copied ? "Copied!" : "Copy address"}
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-md opacity-70">Balance:</span>
            <div className="text-xl font-bold text-primary">{balance} USDC</div>
          </div>
        </div>
        
        {Number(balance) === 0 && (
          <div className="text-sm text-warning">
            ⚠️ USDC is required for taking positions. Get Base Sepolia testnet USDC from{' '}
            <a 
              href="https://faucet.circle.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="link link-primary"
            >
              Circle Faucet
            </a>
          </div>
        )}
      </div>
    </div>
  );
} 