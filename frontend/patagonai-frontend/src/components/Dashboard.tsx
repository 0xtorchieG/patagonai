import ChatSection from "./ChatSection";
import MarketsSection from "./MarketsSection";
import WalletSection from "./WalletSection";

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <ChatSection />
      <div className="w-1/2 flex flex-col">
        <div className="flex-1 overflow-auto">
          <MarketsSection />
        </div>
        <WalletSection />
      </div>
    </div>
  );
} 