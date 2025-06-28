'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Image from 'next/image';

const MARKET_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "seller", "type": "address"}],
    "name": "getSellerListings",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "getListing",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"internalType": "address", "name": "nftContract", "type": "address"},
        {"internalType": "address", "name": "seller", "type": "address"},
        {"internalType": "uint256", "name": "price", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"},
        {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
      ],
      "internalType": "struct NFTMarket.Listing",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "listingId", "type": "uint256"}],
    "name": "cancelListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "listingId", "type": "uint256"},
      {"internalType": "uint256", "name": "newPrice", "type": "uint256"}
    ],
    "name": "updatePrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const NFT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenID", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const MARKET_ADDRESS = '0xA28ab4d6907831DAb110F2193BD6C54BE6988F88';

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export function MyListings() {
  const { address, isConnected } = useAccount();
  const [editingPrice, setEditingPrice] = useState<{id: number, price: string} | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Lấy listings của user
  const { data: myListingIds, isLoading: isLoadingListings, refetch: refetchMyListings } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getSellerListings',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 30000
    }
  });

  // Component cho từng listing
  function MyListingItem({ listingId }: { listingId: bigint }) {
    const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
    const [imageError, setImageError] = useState(false);

    // Lấy thông tin listing
    const { data: listing } = useReadContract({
      address: MARKET_ADDRESS,
      abi: MARKET_ABI,
      functionName: 'getListing',
      args: [listingId],
    });

    // Lấy tokenURI
    const { data: tokenURI } = useReadContract({
      address: listing?.nftContract as `0x${string}` || undefined,
      abi: NFT_ABI,
      functionName: 'tokenURI',
      args: listing ? [listing.tokenId] : undefined,
      query: { enabled: !!listing }
    });

    // Load metadata
    useEffect(() => {
      const loadMetadata = async () => {
        if (!tokenURI) return;
        
        try {
          const response = await fetch(tokenURI);
          const metadataJson = await response.json();
          setMetadata(metadataJson);
        } catch (err) {
          console.error('Error loading metadata:', err);
        }
      };

      loadMetadata();
    }, [tokenURI]);

    if (!listing) return <div className="p-4 text-center">Loading listing...</div>;

    const isEditing = editingPrice?.id === Number(listingId);

    return (
      <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
        <div className="flex justify-between items-start">
          {/* NFT Info */}
          <div className="flex gap-4 flex-1">
            {/* Image */}
            <div className="w-20 h-20 bg-white border border-purple-200 rounded-md overflow-hidden relative">
              {metadata?.image && !imageError ? (
                <Image
                  src={metadata.image}
                  alt={metadata.name || `NFT #${listing.tokenId}`}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-500 text-xs">
                  {imageError ? 'Image Error' : 'No Image'}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1 text-purple-800">
                {metadata?.name || `NFT #${listing.tokenId}`}
              </h4>
              <p className="text-sm text-purple-600 mb-2 line-clamp-2">
                {metadata?.description || 'No description'}
              </p>
              <div className="text-sm space-y-1 text-purple-700">
                <p><strong>Token ID:</strong> #{listing.tokenId.toString()}</p>
                <p><strong>Contract:</strong> {listing.nftContract.slice(0, 10)}...{listing.nftContract.slice(-6)}</p>
                <p><strong>Current Price:</strong> <span className="text-blue-600 font-bold">{formatEther(listing.price)} ROSE</span></p>
                <p><strong>Status:</strong> {listing.isActive ? '🟢 Active' : '🔴 Inactive'}</p>
                <p><strong>Created:</strong> {new Date(Number(listing.createdAt) * 1000).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 ml-4">
            {listing.isActive && (
              <>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editingPrice.price}
                      onChange={(e) => setEditingPrice({id: Number(listingId), price: e.target.value})}
                      placeholder="New price"
                      className="w-24 px-2 py-1 border border-purple-300 rounded text-sm bg-white"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUpdatePrice(Number(listingId), editingPrice.price)}
                        disabled={isPending || isConfirming}
                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:bg-gray-400"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => setEditingPrice(null)}
                        className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingPrice({id: Number(listingId), price: formatEther(listing.price)})}
                      disabled={isPending || isConfirming}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      💰 Update Price
                    </button>
                    <button
                      onClick={() => handleCancel(Number(listingId))}
                      disabled={isPending || isConfirming}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
                    >
                      🗑️ Cancel
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleCancel = (listingId: number) => {
    writeContract({
      address: MARKET_ADDRESS,
      abi: MARKET_ABI,
      functionName: 'cancelListing',
      args: [BigInt(listingId)],
    });
  };

  const handleUpdatePrice = (listingId: number, newPrice: string) => {
    try {
      const priceInWei = parseEther(newPrice);
      writeContract({
        address: MARKET_ADDRESS,
        abi: MARKET_ABI,
        functionName: 'updatePrice',
        args: [BigInt(listingId), priceInWei],
      });
      setEditingPrice(null);
    } catch (err) {
      alert('Lỗi format giá!');
      console.log('Error formatting price:', err);
    }
  };

  // Refresh khi transaction confirm
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchMyListings();
      }, 2000);
    }
  }, [isConfirmed, refetchMyListings]);

  if (!isConnected) {
    return (
      <div className="p-6 border border-purple-300 rounded-lg text-center bg-purple-50">
        <h3 className="text-xl font-bold mb-4 text-purple-800">📋 My Listings</h3>
        <p className="text-purple-600">Vui lòng kết nối ví để xem listings của bạn</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-purple-600">📋 My Listings</h3>
        <button
          onClick={() => refetchMyListings()}
          disabled={isLoadingListings}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 text-sm"
        >
          {isLoadingListings ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>
      
      {isLoadingListings ? (
        <p className="text-purple-600 text-center py-8">🔄 Đang tải listings...</p>
      ) : !myListingIds || myListingIds.length === 0 ? (
        <div className="text-center py-8 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-700">📭 Bạn chưa có listing nào</p>
          <p className="text-sm text-purple-600 mt-2">
            Hãy list một NFT để bắt đầu bán!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myListingIds.map((listingId) => (
            <MyListingItem key={listingId.toString()} listingId={listingId} />
          ))}
        </div>
      )}

      {/* Transaction Status */}
      {hash && (
        <div className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>Transaction Hash:</strong>
            <br />
            <a 
              href={`https://explorer.oasis.io/testnet/sapphire/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:underline break-all"
            >
              {hash}
            </a>
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-md">
          <p className="text-green-700 font-medium">
            ✅ Thao tác thành công! Đang refresh danh sách...
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-3 bg-slate-800 text-slate-100 rounded-md text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>My Listings Count: {myListingIds?.length || 0}</p>
        <p>Address: {address?.slice(0, 10)}...{address?.slice(-6)}</p>
      </div>
    </div>
  );
}