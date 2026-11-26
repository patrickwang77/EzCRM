# EzCRM — B2B 智慧銷售管線與分析系統

EzCRM 是一套專為 B2B 業務團隊設計的銷售管線與管理指標系統，提供 **Pipeline 看板 / 表格 / 甘特圖**、**客戶總覽 360°**、**管理指標檢核（週/月報與目標達成率）**、**活動任務歷程**，以及完整的 **多層級組織與 RBAC 權限控管**。

專案內建 **雙模式資料庫引擎**：
- **Firebase 雲端模式**：設定 `.env.local` 後，自動啟用 **Google 帳號登入（Email 白名單）** + **Cloud Firestore 即時雲端儲存** + **Firestore Security Rules 後端權限驗證**，可免費運行於 Firebase Spark 方案。
- **本機試用模式（LocalStorage）**：未設定 Firebase 環境變數時，自動降級為瀏覽器 `localStorage` 單機試用模式，零設定即可直接體驗完整功能與測試多角色切換。

---

## 核心功能一覽

| 模組 | 功能重點 |
| :--- | :--- |
| **分析儀表板 (Dashboard)** | 5 大高管 KPI 卡片（潛在商機總額、加權預估、BD Progress %、成交/流失統計、活動完成率）、雙視角銷售漏斗（金額 / 件數）、組織樹 / 業務 / 客戶 / 月份區間 Slicer、待辦任務清單 |
| **BD Pipeline** | 支援 **看板拖曳**、**表格清單**、**週/月/季彈性甘特圖** 三種視圖切換；商機抽屜 (Drawer) 快速登記活動、點擊客戶自動篩選、點擊業務檢視個人管線、金額乘積自動試算 (`月數量 × 單價`) 與費用預算編列 |
| **客戶總覽 360° (Accounts)** | 彙整單一客戶之歷史商機總額、活躍進度、聯絡窗口名冊與內聯新增聯絡人 |
| **管理指標檢核 (Metrics)** | 依部門 / Sales Rep / 客戶分析 BD Progress %、活動量化金額計算、週/月區間檢核表與月度目標達成率 (`Target vs. Actual`)、CSV 一鍵匯出（含 UTF-8 BOM） |
| **任務活動歷程 (Activities)** | 區分待辦與已完成歷程、逾期高亮警示、活動詳情 Modal 與客戶聯絡人連動、一鍵跳轉至對應客戶管線 |
| **全域快速建立 (`Ctrl/⌘ + K`)** | 任意頁面快速建立商機（含內聯新建公司）、活動紀錄或客戶與窗口 |
| **系統與銷售設定 (Settings)** | 自訂進行中銷售階段（鎖定 `BD Won` / `BD Lost` 結案邏輯）、多層級組織樹拖曳指派人員、人員帳號與 RBAC 角色管理、活動類型與量化單價、產品線與預算科目 |

---

## 技術堆疊

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Lucide Icons
- **認證與資料庫**：Firebase Authentication (Google Sign-In) + Cloud Firestore / LocalStorage 雙模式抽象層
- **安全與現代 Web 規範**：原生 `<dialog>` 無障礙 Modal、CSP / `X-Frame-Options` / `COOP` 安全標頭、Route-level Code Splitting、深淺色模式防 FOUC 同步

---

## 快速開始（本機開發 / 單機試用）

```bash
# 1. 安裝相依套件
npm install

# 2. 啟動開發伺服器（未設定 .env.local 時自動進入 LocalStorage 展示模式）
npm run dev
```

若要使用本機開發環境模擬 **Clean Start（無範例業務資料）**：

```bash
cp .env.example .env.local
# 依需求調整 .env.local 內的 VITE_CLEAN_START=true
npm run dev
```

---

## 環境變數說明

請參考 [`.env.example`](.env.example)：

| 變數名稱 | 預設值 | 說明 |
| :--- | :--- | :--- |
| `VITE_CLEAN_START` | `true` | `true` 時不載入預設範例公司與商機（僅於 LocalStorage 模式生效；Firebase 模式預設即為 Clean Start） |
| `VITE_DEFAULT_VARIANT` | `A` | 預設版面（`A`：可折疊側欄工作台） |
| `VITE_SHOW_VARIANT_SWITCHER` | `false` | 設為 `true` 時顯示頂部 A/B/C 原型版面切換器 |
| `VITE_FIREBASE_API_KEY` | *(選填)* | Firebase Web App API Key（填入後啟用 Firebase 雲端模式） |
| `VITE_FIREBASE_AUTH_DOMAIN` | *(選填)* | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | *(選填)* | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | *(選填)* | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | *(選填)* | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | *(選填)* | Firebase App ID |

---

## 相關文件

- [系統架構與資料模型設計](docs/ARCHITECTURE.md)
- [Firebase 雲端部署與日常帳號管理指南](docs/DEPLOYMENT.md)
- [B2B CRM 原始開發規格書](B2B%20CRM%20開發文件.md)

---

## Docker 部署（純靜態單機容器）

```bash
docker compose up -d --build
# 啟動後開啟 http://localhost:8080
```

> **提示**：Docker 映像檔建置預設不含 `.env.local`，會以 `VITE_CLEAN_START=true` 的 LocalStorage 模式啟動；如需連接 Firebase，請於建置前將設定寫入環境或建置參數。
