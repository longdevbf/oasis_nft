'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import {  formatEther } from 'viem';

const MARKET_ABI = [
  {
    "inputs": [],
    "name": "getActiveListings",
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
    "name": "buyNFT",
    "outputs": [],
    "stateMutability": "payable",
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
//const NFT_ADDRESS = '0x61fc08123a1c2DeAb39e0f32b1Cb90cc094fe3E6';

// interface Listing {
//   tokenId: bigint;
//   nftContract: string;
//   seller: string;
//   price: bigint;
//   isActive: boolean;
//   createdAt: bigint;
// }

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
}

export function BrowseNFTs() {
  const { address, isConnected } = useAccount();
  //const [listings, setListings] = useState<{id: number, data: Listing, metadata?: NFTMetadata}[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Lấy danh sách active listings từ contract
  const { data: activeListingIds, isLoading: isLoadingListings, refetch: refetchListings } = useReadContract({
    address: MARKET_ADDRESS,
    abi: MARKET_ABI,
    functionName: 'getActiveListings',
    query: {
      refetchInterval: 30000, // Refresh mỗi 30 giây
    }
  });

  // Component con để load từng listing
  function ListingItem({ listingId }: { listingId: bigint }) {
    const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
    const [loadingMetadata, setLoadingMetadata] = useState(false);

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

    // Load metadata từ IPFS
    useEffect(() => {
      const loadMetadata = async () => {
        if (!tokenURI) return;
        
        setLoadingMetadata(true);
        try {
          const response = await fetch(tokenURI);
          const metadataJson = await response.json();
          setMetadata(metadataJson);
        } catch (error) {
          console.error('Error loading metadata:', error);
          setMetadata({
            name: `NFT #${listing?.tokenId}`,
            description: 'Metadata không thể tải được',
            image: ''
          });
        } finally {
          setLoadingMetadata(false);
        }
      };

      loadMetadata();
    }, [tokenURI, listing?.tokenId]);

    const handleBuy = () => {
      if (!listing) return;
      
      writeContract({
        address: MARKET_ADDRESS,
        abi: MARKET_ABI,
        functionName: 'buyNFT',
        args: [listingId],
        value: listing.price,
      });
    };

    if (!listing || !listing.isActive) {
      return null;
    }

    return (
      <div className="border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
        {/* NFT Image */}
        <div className="aspect-square bg-gray-100">
          {loadingMetadata ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              🔄 Loading...
            </div>
          ) : metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.name || `NFT #${listing.tokenId}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              🖼️ No Image
            </div>
          )}
          <div className="w-full h-full hidden items-center justify-center text-gray-500">
            🖼️ Image Error
          </div>
        </div>

        {/* NFT Info */}
        <div className="p-4">
          <h4 className="font-bold text-lg mb-2">
            {metadata?.name || `NFT #${listing.tokenId}`}
          </h4>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {metadata?.description || 'No description available'}
          </p>

          <div className="space-y-2 text-sm">
            <p><strong>Token ID:</strong> #{listing.tokenId.toString()}</p>
            <p><strong>Contract:</strong> {listing.nftContract.slice(0, 6)}...{listing.nftContract.slice(-4)}</p>
            <p><strong>Seller:</strong> {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
            <p><strong>Price:</strong> <span className="text-lg font-bold text-blue-600">{formatEther(listing.price)} ROSE</span></p>
          </div>

          {/* Buy Button */}
          <button
            onClick={handleBuy}
            disabled={
              listing.seller.toLowerCase() === address?.toLowerCase() ||
              isPending ||
              isConfirming ||
              !listing.isActive
            }
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {listing.seller.toLowerCase() === address?.toLowerCase() 
              ? '🚫 Your NFT' 
              : !listing.isActive
              ? '❌ Not Available'
              : isPending 
              ? '🔄 Buying...' 
              : isConfirming 
              ? '⏳ Confirming...' 
              : '🛒 Buy Now'
            }
          </button>
        </div>
      </div>
    );
  }

  // Refresh khi transaction confirm
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        refetchListings();
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
    }
  }, [isConfirmed, refetchListings]);

  if (!isConnected) {
    return (
      <div className="p-6 border border-gray-300 rounded-lg text-center">
        <h3 className="text-xl font-bold mb-4">🛒 Browse NFTs</h3>
        <p className="text-gray-600">Vui lòng kết nối ví để xem NFTs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-blue-600">🛒 Browse NFTs</h3>
        <button
          onClick={() => {
            refetchListings();
            setRefreshTrigger(prev => prev + 1);
          }}
          disabled={isLoadingListings}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 text-sm"
        >
          {isLoadingListings ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>
      
      {isLoadingListings ? (
        <div className="text-center py-8">
          <p className="text-gray-600">🔄 Đang tải NFTs...</p>
        </div>
      ) : !activeListingIds || activeListingIds.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">📭 Chưa có NFT nào đang được bán</p>
          <p className="text-sm text-gray-500 mt-2">
            Hãy thử list một NFT để test marketplace!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeListingIds.map((listingId) => (
            <ListingItem key={`${listingId}-${refreshTrigger}`} listingId={listingId} />
          ))}
        </div>
      )}

      {/* Transaction Status */}
      {hash && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Transaction Hash:</strong>
            <br />
            <a 
              href={`https://explorer.oasis.io/testnet/sapphire/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {hash}
            </a>
          </p>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded-md">
          <p className="text-green-700 font-medium">
            ✅ NFT đã được mua thành công! Đang refresh danh sách...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-md">
          <p className="text-red-700 text-sm">
            ❌ Lỗi: {error.message}
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-3 bg-blue-100 text-blue-900 rounded-md text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Market Contract: {MARKET_ADDRESS}</p>
        <p>Active Listings: {activeListingIds?.length || 0}</p>
        <p>Connected: {isConnected ? '✅' : '❌'}</p>
        <p>Address: {address?.slice(0, 10)}...{address?.slice(-6)}</p>
      </div>
    </div>
  );
}