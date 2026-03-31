# 寶可夢篩選器

## 技術棧
- React 18 + TypeScript + Vite
- Tailwind CSS v3 (深色主題)
- Radix UI (Slider, Dialog, Tabs)
- idb (IndexedDB wrapper)
- 資料來源：PokéAPI (https://pokeapi.co/)

## 目錄結構
```
src/
├── types/pokemon.ts          # 共用 TypeScript 型別
├── constants/                # 靜態設定（stats, types, moves）
├── db/pokemonDB.ts           # IndexedDB 存取層
├── services/
│   ├── pokeapi.ts            # PokéAPI fetch 函式
│   └── dataLoader.ts         # 批次載入 + 快取邏輯
├── stores/
│   ├── usePokemonStore.ts    # 寶可夢資料 + 篩選狀態
│   └── useMoveStore.ts       # 招式搜尋狀態
├── hooks/
│   └── useFilteredPokemon.ts # 篩選/排序邏輯（useMemo）
└── components/
    ├── pokemon/              # 表格、列、詳情 Modal
    ├── filters/              # 篩選面板、能力值滑桿
    ├── moves/                # 招式搜尋面板、結果卡片
    └── ui/                   # 載入進度條
```

## 資料載入策略
- 首次載入：批次 fetch（每批 20 隻，間隔 300ms），先顯示第 1-151 隻後解鎖表格
- 快取：IndexedDB（TTL 7 天），再次訪問直接從本機讀取
- 招式：按需載入（搜尋時才 fetch），結果也快取到 IndexedDB

## 開發指令
```bash
npm run dev    # 開發伺服器
npm run build  # 正式建置
```
