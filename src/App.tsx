import { useState } from "react";
import { PokemonProvider } from "./stores/usePokemonStore";
import { MoveProvider } from "./stores/useMoveStore";
import { ShowdownProvider } from "./stores/useShowdownStore";
import { PokemonTable } from "./components/pokemon/PokemonTable";
import { MoveSearchPanel } from "./components/moves/MoveSearchPanel";
import { LoadingBar } from "./components/ui/LoadingBar";
import { usePokemonStore } from "./stores/usePokemonStore";
import { ShowdownDebugPanel } from "./components/debug/ShowdownDebugPanel";

const IS_DEV = import.meta.env.DEV;

type Tab = "pokemon" | "moves" | "debug";

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("pokemon");
  const { loadingState, loadingProgress, loadingTotal, resetFilters } = usePokemonStore();

  const tabs: { key: Tab; label: string }[] = [
    { key: "pokemon", label: "寶可夢篩選" },
    { key: "moves", label: "招式查詢" },
    ...(IS_DEV ? [{ key: "debug" as Tab, label: "🛠 除錯" }] : []),
  ];

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden">
      <LoadingBar loaded={loadingProgress} total={loadingTotal} state={loadingState} />

      {/* Header */}
      <div className="relative shrink-0">
        <header className="border-b border-surface-border bg-surface-card px-4 py-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">寶可夢篩選器</span>
            <span className="text-xs text-gray-500 mt-0.5">測試版</span>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeTab === tab.key
                    ? "bg-accent-blue text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-surface-hover"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto text-xs text-gray-500">資料來源：PokéAPI</div>
        </header>

        <button
          onClick={resetFilters}
          className="absolute bottom-0 right-0 translate-y-full z-20 text-xs px-2 py-1 rounded-b border-x border-b border-red-600 text-red-400 bg-surface-card hover:bg-red-600/20 transition-colors"
        >
          清除所有篩選
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "pokemon" && <PokemonTable />}
        {activeTab === "moves" && <MoveSearchPanel />}
        {activeTab === "debug" && IS_DEV && <ShowdownDebugPanel />}
      </main>
    </div>
  );
}


function App() {
  return (
    <ShowdownProvider>
      <PokemonProvider>
        <MoveProvider>
          <AppContent />
        </MoveProvider>
      </PokemonProvider>
    </ShowdownProvider>
  );
}

export default App;
