import { Suspense } from "react";
import { TarotClient } from "./TarotClient";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f7f3ee] text-sm text-stone-600">
          正在打开塔罗洞察 Agent...
        </div>
      }
    >
      <TarotClient />
    </Suspense>
  );
}
