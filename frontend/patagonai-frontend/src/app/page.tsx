"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "./client";
import { baseSepolia } from "thirdweb/chains";
import Image from "next/image";
import Dashboard from "@/components/Dashboard";
import { Footer } from "@/components/Footer";

export default function Home() {
  const address = useActiveAccount();

  if (address) {
    return <Dashboard />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-[32rem] bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="relative w-80 h-80 mb-6">
            <Image
              src="/agent-banker.png"
              alt="Gen Z Wall Street Banker"
              width={400}
              height={400}
              priority
              className="shadow-lg"
            />
          </div>
          <h1 className="card-title text-4xl font-bold mb-4">PatagonAI 🚀</h1>
          <p className="text-2xl mb-4 font-semibold">AI-Powered Prediction Markets 🤖</p>
          <p className="text-xl mb-8 font-bold">
            Think You Can Beat Wall Street? 📈
            <br/>
            Put on your vest and bring your best alpha 
            <br/>
            <span >WAGMI 💰</span>
          </p>
          
          <ConnectButton
            client={client}
            accountAbstraction={{
              chain: baseSepolia,
              sponsorGas: true,
            }}
            appMetadata={{
              name: "PatagonAI Prediction Markets",
              url: "https://patagonai.xyz",
            }}
          />
        </div>
        <Footer />
      </div>
    </main>
  );
}

