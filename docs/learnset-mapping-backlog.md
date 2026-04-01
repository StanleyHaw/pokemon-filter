# Learnset Mapping Backlog

**狀態：** 資料品質修補中（不阻塞功能開發）
**最後 audit 時間：** 2026-04-01
**Audit 工具：** `node scripts/auditLearnsetMapping.mjs`

---

## Audit 摘要

| 命中方式 | 筆數 | 說明 |
|---|---|---|
| exact | 1065 | `toShowdownId(name)` 直接命中 |
| form-override | 1 | `POKEAPI_FORM_OVERRIDES` 精確映射 |
| suffix-strip | 7 | 後綴剝離退回基底種族 |
| **unresolved** | **93** | 無法命中，招式篩選永遠空 |
| **總計** | **1166** | |

---

## 已修正案例

| Pokémon | PokéAPI name | 修正後 Showdown ID | 修正方式 | 修正時間 |
|---|---|---|---|---|
| 怒鸚哥 | `squawkabilly-green-plumage` | `squawkabilly` | `POKEAPI_FORM_OVERRIDES` | 2026-04-01 |

---

## 93 筆 Unresolved 分類

### 模式 A：PokéAPI 後綴與 Showdown key 不一致（共 69 筆）

PokéAPI 對「預設形態」或「替代形態」加了描述性後綴（`-normal`, `-male`, `-shield` 等），
但 Showdown learnset 只有 base name 或採用不同縮寫。

**處理策略：** 批次加入 `POKEAPI_FORM_OVERRIDES`（每筆都已確認 Showdown target 存在）

#### A1：PokéAPI 加後綴，Showdown 用 base name（可批次處理，共 56 筆）

| PokéAPI name | → Showdown ID |
|---|---|
| deoxys-normal | deoxys |
| deoxys-attack | deoxys |
| deoxys-defense | deoxys |
| deoxys-speed | deoxys |
| wormadam-plant | wormadam |
| giratina-altered | giratina |
| shaymin-land | shaymin |
| shaymin-sky | shaymin |
| basculin-red-striped | basculin |
| basculin-blue-striped | basculin |
| darmanitan-standard | darmanitan |
| darmanitan-zen | darmanitan |
| frillish-male | frillish |
| jellicent-male | jellicent |
| tornadus-incarnate | tornadus |
| thundurus-incarnate | thundurus |
| landorus-incarnate | landorus |
| enamorus-incarnate | enamorus |
| keldeo-ordinary | keldeo |
| meloetta-aria | meloetta |
| meloetta-pirouette | meloetta |
| pyroar-male | pyroar |
| meowstic-male | meowstic |
| aegislash-shield | aegislash |
| aegislash-blade | aegislash |
| pumpkaboo-average | pumpkaboo |
| pumpkaboo-small | pumpkaboo |
| pumpkaboo-large | pumpkaboo |
| gourgeist-average | gourgeist |
| gourgeist-small | gourgeist |
| gourgeist-large | gourgeist |
| zygarde-50 | zygarde |
| zygarde-10-power-construct | zygarde10 |
| zygarde-50-power-construct | zygarde |
| oricorio-baile | oricorio |
| oricorio-pom-pom | oricorio |
| oricorio-pau | oricorio |
| oricorio-sensu | oricorio |
| lycanroc-midday | lycanroc |
| wishiwashi-solo | wishiwashi |
| wishiwashi-school | wishiwashi |
| mimikyu-disguised | mimikyu |
| toxtricity-amped | toxtricity |
| eiscue-ice | eiscue |
| eiscue-noice | eiscue |
| indeedee-male | indeedee |
| morpeko-full-belly | morpeko |
| morpeko-hangry | morpeko |
| urshifu-single-strike | urshifu |
| basculegion-male | basculegion |
| oinkologne-male | oinkologne |
| maushold-family-of-four | maushold |
| palafin-zero | palafin |
| tatsugiri-curly | tatsugiri |
| tatsugiri-droopy | tatsugiri |
| dudunsparce-two-segment | dudunsparce |
| terapagos-terastal | terapagos |

#### A2：Showdown 採用不同縮寫（需個別對應，共 13 筆）

| PokéAPI name | → Showdown ID | 備註 |
|---|---|---|
| meowstic-female | meowsticf | Showdown 用 `f` 後綴 |
| indeedee-female | indeedeef | 同上 |
| basculegion-female | basculegionf | 同上 |
| oinkologne-female | oinkolognef | 同上 |
| necrozma-dusk | necrozmaduskmane | Showdown 保留 mane |
| necrozma-dawn | necrozmadawnwings | Showdown 保留 wings |
| darmanitan-galar-standard | darmanitangalar | 不含 standard |
| tauros-paldea-combat-breed | taurospaldeacombat | 不含 breed |
| tauros-paldea-blaze-breed | taurospaldeablaze | 同上 |
| tauros-paldea-aqua-breed | taurospaldeaaqua | 同上 |
| rockruff-own-tempo | rockruff | Showdown 不區分 own tempo |
| zygarde-complete | zygarde | 100% 形態視同 base |
| zygarde-10-power-construct | zygarde10 | ✅（此筆 suffix-strip 已可命中）|

---

### 模式 B：戰鬥中切換形態 / 機制形態（共 17 筆）

這些形態在戰鬥中自動切換，通常共用 base 的招式組，
Showdown learnset 要確認是否有獨立條目。

**處理策略：** 逐一確認 Showdown 實際 key，再決定是映射到 base 還是另立 override

| PokéAPI name | 建議 Showdown ID | 備註 |
|---|---|---|
| hoopa-unbound | hoopa | Showdown learnset 無 hoopaunbound |
| greninja-ash | greninjabond | Showdown 用 bond 而非 ash |
| darmanitan-galar-zen | darmanitangalar | zen 形態共用 Galar base learnset |
| palafin-hero | palafin | hero 形態無獨立 learnset |
| gimmighoul-roaming | gimmighoul | roaming 形態無獨立 learnset |
| terapagos-stellar | terapagos | stellar 形態無獨立 learnset |
| ogerpon-wellspring-mask | ogerpon | 三個面具形態共用 ogerpon |
| ogerpon-hearthflame-mask | ogerpon | 同上 |
| ogerpon-cornerstone-mask | ogerpon | 同上 |
| koraidon-limited-build | koraidon | 4 個騎乘形態共用 learnset |
| koraidon-sprinting-build | koraidon | 同上 |
| koraidon-swimming-build | koraidon | 同上 |
| koraidon-gliding-build | koraidon | 同上 |
| miraidon-low-power-mode | miraidon | 4 個騎乘形態共用 learnset |
| miraidon-drive-mode | miraidon | 同上 |
| miraidon-aquatic-mode | miraidon | 同上 |
| miraidon-glide-mode | miraidon | 同上 |

---

### 模式 C：純外觀形態（共 7 筆，預期無招式影響）

這些形態在戰鬥中由技能觸發，自身不具有獨立招式組。
Showdown learnset 收錄在 base form 下，`resolveLearnsetId` 應映射到 base，
但因為 PokéAPI 後綴無法剝離而落入 unresolved。

**處理策略：** 確認這些形態是否應顯示在列表中；若應顯示，加入 `POKEAPI_FORM_OVERRIDES` 映射到 base

| PokéAPI name | → Showdown base | 備註 |
|---|---|---|
| castform-sunny | castform | 天氣觸發形態 |
| castform-rainy | castform | 同上 |
| castform-snowy | castform | 同上 |
| minior-red | minior | 核心形態（已在 FORCE_INCLUDE_NAMES）|
| cramorant-gulping | cramorant | 技能觸發形態 |
| cramorant-gorging | cramorant | 同上 |
| zygarde-complete | zygarde | 100% Power Construct 形態 |

---

## 優先處理建議

依照對招式篩選功能的影響程度排序：

### P0：VGC 常見競技用 Pokémon（應優先修，影響篩選結果正確性）

這些出現在實際競技環境，搜尋招式時預期出現卻不出現：

- `ogerpon-*-mask` → `ogerpon`（面具三型態，Reg G+ 常見）
- `urshifu-single-strike` → `urshifu`
- `indeedee-female` → `indeedeef`（Psychic Surge 搭配）
- `tauros-paldea-*-breed` → 各自 Showdown ID
- `koraidon-*` / `miraidon-*` → base（限制傳說）
- `palafin-hero` → `palafin`

### P1：已知招式特性差異的形態

- `toxtricity-amped` / low-key → `toxtricity`（兩者能力不同但共用 learnset）
- `lycanroc-midday` / midnight / dusk → `lycanroc`
- `darmanitan-*` 系列

### P2：外觀差異但招式完全相同

- `oricorio-*` → `oricorio`
- `basculin-*` → `basculin`
- `pumpkaboo-*` / `gourgeist-*` 尺寸形態
- `castform-*` / `cramorant-*`（model C）

### P3：稀有 / 非競技環境用

- Deoxys 四形態、Shaymin-Sky、Giratina 等傳說形態

---

## 修補方式

修補一律透過 `src/lib/showdown/showdownId.ts` 的 `POKEAPI_FORM_OVERRIDES`：

```typescript
const POKEAPI_FORM_OVERRIDES: Record<string, string> = {
  // 已修正
  squawkabillygreenplumage: "squawkabilly",
  // ...

  // 待加入（P0 示例）
  ogerponwellspringmask:   "ogerpon",
  ogerponhearthflamemask:  "ogerpon",
  ogerponcornerstonemask:  "ogerpon",
  urshifusinglestrike:     "urshifu",
  // ...
};
```

**加入前必須確認：**
1. `node -e "const d = require('./public/showdown/learnsets.json'); console.log(!!d['<target>']?.learnset)"` 回傳 `true`
2. Audit script 重新執行後，unresolved 數量減少

---

## 相關檔案

| 檔案 | 說明 |
|---|---|
| `scripts/auditLearnsetMapping.mjs` | 執行 audit，產出最新 unresolved 清單 |
| `src/lib/showdown/showdownId.ts` | `POKEAPI_FORM_OVERRIDES` 定義位置 |
| `src/constants/moveOverrides.ts` | Move-level override（Mirror Herb 等） |

---

## 維護紀錄

| 日期 | 動作 | 結果 |
|---|---|---|
| 2026-04-01 | 初次 audit | 1166 筆，93 unresolved |
| 2026-04-01 | 修正 Squawkabilly form mapping | unresolved 由 94 → 93 |
