import ChatSection from "./ChatSection";
import MarketsSection from "./MarketsSection";

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <ChatSection />
      <MarketsSection />
    </div>
  );
} 