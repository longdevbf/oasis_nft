// src/components/nftMarketplace.tsx
'use client';

import { useState } from 'react';
import { ListNFT } from './listNFT';
import { BrowseNFTs } from './browserNFTs';
import { MyListings } from './myListings';
import { MarketStats } from './marketStats';

export function NFTMarketplace() {
  const [activeTab, setActiveTab] = useState<'browse' | 'list' | 'my-listings' | 'stats'>('browse');

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'browse'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🛒 Browse NFTs
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 List NFT
        </button>
        <button
          onClick={() => setActiveTab('my-listings')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'my-listings'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 My Listings
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 Stats
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'browse' && <BrowseNFTs />}
        {activeTab === 'list' && <ListNFT />}
        {activeTab === 'my-listings' && <MyListings />}
        {activeTab === 'stats' && <MarketStats />}
      </div>
    </div>
  );
}