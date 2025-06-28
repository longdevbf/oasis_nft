// src/components/marketplace/marketStats.tsx
'use client';

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';

const MARKET_ABI = [
  {
    "inputs": [],
    "name": "getTotalListings",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "marketplaceFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeesBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const MARKET_ADDRESS = '0xA28ab4d6907831DAb110F2193BD6C54BE6988F88';

export function MarketStats() {
  const { data: totalListings } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getTotalListings',
  });

  const { data: marketplaceFee } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'marketplaceFee',
  });

  const { data: feesBalance } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getFeesBalance',
  });

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-orange-600">📊 Market Statistics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h4 className="text-lg font-semibold text-blue-800 mb-2">Total Listings</h4>
          <p className="text-3xl font-bold text-blue-600">
            {totalListings?.toString() || '0'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h4 className="text-lg font-semibold text-green-800 mb-2">Marketplace Fee</h4>
          <p className="text-3xl font-bold text-green-600">
            {marketplaceFee ? `${Number(marketplaceFee) / 100}%` : '2.5%'}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <h4 className="text-lg font-semibold text-purple-800 mb-2">Fees Collected</h4>
          <p className="text-3xl font-bold text-purple-600">
            {feesBalance ? `${formatEther(feesBalance)} ROSE` : '0 ROSE'}
          </p>
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-100 text-blue-900 rounded-md text-xs">
        <h4 className="text-lg font-semibold mb-4">ℹ️ Marketplace Info</h4>
        <div className="space-y-2 text-sm">
          <p><strong>Contract Address:</strong> {MARKET_ADDRESS}</p>
          <p><strong>Network:</strong> Oasis Sapphire Testnet</p>
          <p><strong>Fee Structure:</strong> 2.5% từ người bán</p>
          <p><strong>Supported Tokens:</strong> ERC-721 NFTs</p>
        </div>
      </div>
    </div>
  );
}