import { ConnectWallet } from "@/components/connectWallet";

import { MintNFT } from "@/components/mintNFT";
import {NFTMarketplace} from "@/components/nftMarketplace";
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-center">
          Connect With Oasis Blockchain
        </h1>
        <ConnectWallet />
        <MintNFT/>
        <NFTMarketplace />
        
      </div>
    </div>
  );
}