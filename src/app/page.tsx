import { ConnectWallet } from "@/components/connectWallet";
import { MintNFT } from "@/components/mintNFT";
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-center">
          Kết nối với Oasis Blockchain
        </h1>
        <ConnectWallet />
        <MintNFT />
      </div>
    </div>
  );
}