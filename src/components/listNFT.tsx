'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, isAddress } from 'viem';

const MARKET_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "nftContract", "type": "address"},
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "uint256", "name": "price", "type": "uint256"}
    ],
    "name": "listNFT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const NFT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "bool", "name": "approved", "type": "bool"}
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "operator", "type": "address"}
    ],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenID", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const MARKET_ADDRESS = '0xA28ab4d6907831DAb110F2193BD6C54BE6988F88';

interface NFTInfo {
  contract: string;
  tokenId: string;
  owner: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  tokenURI?: string;
}

export function ListNFT() {
  const { address, isConnected } = useAccount();
  
  // Form data
  const [nftContract, setNftContract] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [price, setPrice] = useState('');
  
  // UI states
  const [step, setStep] = useState<'input' | 'approve' | 'list'>('input');
  const [nftInfo, setNftInfo] = useState<NFTInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Kiểm tra approval
  const { data: isApproved } = useReadContract({
    address: nftContract && isAddress(nftContract) ? nftContract as `0x${string}` : undefined,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address && nftContract && isAddress(nftContract) ? [address, MARKET_ADDRESS] : undefined,
    query: { enabled: !!address && !!nftContract && isAddress(nftContract) }
  });

  // Kiểm tra owner của NFT
  const { data: nftOwner } = useReadContract({
    address: nftContract && isAddress(nftContract) ? nftContract as `0x${string}` : undefined,
    abi: NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !!nftContract && !!tokenId && isAddress(nftContract) }
  });

  // Lấy metadata NFT
  const { data: tokenURI } = useReadContract({
    address: nftContract && isAddress(nftContract) ? nftContract as `0x${string}` : undefined,
    abi: NFT_ABI,
    functionName: 'tokenURI',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: { enabled: !!nftContract && !!tokenId && isAddress(nftContract) }
  });

  // Validate NFT thông tin
  const validateNFT = async () => {
    if (!nftContract || !tokenId || !price) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (!isAddress(nftContract)) {
      alert('Địa chỉ contract không hợp lệ!');
      return;
    }

    if (!nftOwner) {
      alert('NFT không tồn tại hoặc chưa được mint!');
      return;
    }

    if (nftOwner.toLowerCase() !== address?.toLowerCase()) {
      alert('Bạn không sở hữu NFT này!');
      return;
    }

    setIsValidating(true);
    
    // Load metadata nếu có
    let metadata = null;
    if (tokenURI) {
      try {
        const response = await fetch(tokenURI);
        metadata = await response.json();
      } catch (err) {
        console.log('Không thể load metadata:', err);
      }
    }

    setNftInfo({
      contract: nftContract,
      tokenId: tokenId,
      owner: nftOwner,
      metadata: metadata,
      tokenURI: tokenURI
    });

    setIsValidating(false);
    setStep('approve');
  };

  // Handle approve
  const handleApprove = () => {
    if (!nftContract || !isAddress(nftContract)) return;
    
    writeContract({
      address: nftContract as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [MARKET_ADDRESS, true],
    });
  };

  // Handle list
  const handleList = () => {
    if (!nftContract || !tokenId || !price) return;

    try {
      const priceInWei = parseEther(price);
      
      writeContract({
        address: MARKET_ADDRESS,
        abi: MARKET_ABI,
        functionName: 'listNFT',
        args: [nftContract as `0x${string}`, BigInt(tokenId), priceInWei],
      });
    } catch (err) {
      console.error('Error parsing price:', err);
      alert('Lỗi format giá! Vui lòng nhập số hợp lệ.');
    }
  };

  // Reset form
  const resetForm = () => {
    setNftContract('');
    setTokenId('');
    setPrice('');
    setStep('input');
    setNftInfo(null);
  };

  if (!isConnected) {
    return (
      <div className="p-6 border border-gray-300 rounded-lg text-center max-w-md mx-auto">
        <h3 className="text-xl font-bold mb-4">List NFT for Sale</h3>
        <p className="text-gray-600">Vui lòng kết nối ví để list NFT</p>
      </div>
    );
  }

  return (
    <div className="p-6 border border-gray-300 rounded-lg max-w-lg mx-auto">
      <h3 className="text-xl font-bold mb-6 text-green-600">📝 List NFT for Sale</h3>
      
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        <div className={`flex items-center ${step === 'input' ? 'text-blue-600' : step === 'approve' || step === 'list' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'input' ? 'border-blue-600 bg-blue-50' : step === 'approve' || step === 'list' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Input Info</span>
        </div>
        
        <div className={`flex items-center ${step === 'approve' ? 'text-blue-600' : step === 'list' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'approve' ? 'border-blue-600 bg-blue-50' : step === 'list' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Approve</span>
        </div>
        
        <div className={`flex items-center ${step === 'list' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'list' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">List</span>
        </div>
      </div>

      {/* Step 1: Input Information */}
      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">NFT Contract Address:</label>
            <input
              type="text"
              value={nftContract}
              onChange={(e) => setNftContract(e.target.value)}
              placeholder="0x1234567890abcdef..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Địa chỉ contract của NFT (ERC-721)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Token ID:</label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ID của NFT bạn muốn bán
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price (ROSE):</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Giá bán (phí marketplace 2.5% sẽ trừ từ số tiền này)
            </p>
          </div>

          {/* Validation Info */}
          {nftContract && tokenId && (
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p><strong>Owner:</strong> {nftOwner ? (nftOwner.toLowerCase() === address?.toLowerCase() ? '✅ Bạn' : '❌ Không phải bạn') : '⏳ Checking...'}</p>
              <p><strong>Contract valid:</strong> {isAddress(nftContract) ? '✅ Hợp lệ' : '❌ Không hợp lệ'}</p>
            </div>
          )}

          <button
            onClick={validateNFT}
            disabled={!nftContract || !tokenId || !price || isValidating || nftOwner?.toLowerCase() !== address?.toLowerCase()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isValidating ? '🔄 Đang kiểm tra...' : '✅ Validate & Continue'}
          </button>
        </div>
      )}

      {/* Step 2: Approve */}
      {step === 'approve' && nftInfo && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-medium text-green-800 mb-2">✅ NFT Information Validated</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Contract:</strong> {nftInfo.contract.slice(0, 10)}...{nftInfo.contract.slice(-8)}</p>
              <p><strong>Token ID:</strong> #{nftInfo.tokenId}</p>
              <p><strong>Price:</strong> {price} ROSE</p>
              {nftInfo.metadata && <p><strong>Name:</strong> {nftInfo.metadata.name}</p>}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Approval Status:</h4>
            <p className="text-sm text-blue-700">
              {isApproved ? '✅ Marketplace đã được approve' : '❌ Chưa approve marketplace'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('input')}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              ⬅️ Back
            </button>
            
            {!isApproved ? (
              <button
                onClick={handleApprove}
                disabled={isPending || isConfirming}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isPending || isConfirming ? '🔄 Approving...' : '🔑 Approve Marketplace'}
              </button>
            ) : (
              <button
                onClick={() => setStep('list')}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                ➡️ Continue to List
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: List */}
      {step === 'list' && nftInfo && (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-medium text-green-800 mb-2">🚀 Ready to List!</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>NFT:</strong> #{nftInfo.tokenId} from {nftInfo.contract.slice(0, 10)}...</p>
              <p><strong>Price:</strong> {price} ROSE</p>
              <p><strong>Your Receive:</strong> ~{(parseFloat(price) * 0.975).toFixed(4)} ROSE (after 2.5% fee)</p>
              <p><strong>Marketplace Fee:</strong> ~{(parseFloat(price) * 0.025).toFixed(4)} ROSE</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('approve')}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              ⬅️ Back
            </button>
            
            <button
              onClick={handleList}
              disabled={isPending || isConfirming}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {isPending && '🔄 Listing...'}
              {isConfirming && '⏳ Confirming...'}
              {!isPending && !isConfirming && '📝 List NFT'}
            </button>
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {hash && (
        <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Transaction Hash:</strong>
            <br />
            <a 
              href={`https://explorer.oasis.io/testnet/sapphire/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline break-all"
            >
              {hash}
            </a>
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-md">
          <p className="text-green-700 font-medium mb-2">
            ✅ NFT đã được list thành công!
          </p>
          <button
            onClick={resetForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
          >
            🔄 List Another NFT
          </button>
        </div>
      )}
    </div>
  );
}