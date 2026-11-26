# EzCRM 系統架構與資料模型

## 1. 雙模式資料庫抽象層 (`db.ts`)

EzCRM 將所有資料讀寫封裝在 [`src/services/db.ts`](../src/services/db.ts)，並依環境變數動態切換儲存引擎：

```text
React UI Pages / Contexts
          │
          ▼
   src/services/db.ts  (共用業務邏輯、RBAC 過濾、KPI/漏斗計算)
          │
     ┌────┴───────────────────────────────┐
     ▼ (VITE_FIREBASE_* 已設定)           ▼ (未設定)
firestoreAdapter.ts                 localStorage
(Firebase Auth + Cloud Firestore)   (瀏覽器本機試用)
```

- **為什麼共用過濾與計算邏輯？**
  不論底層資料來自 Firestore 還是 `localStorage`，商機月區間判定 (`isOppInMonthRange`)、加權業績計算 (`getAnalyticsKPI`) 與組織樹向下彙總 (`getSubOrgIds`) 皆執行同一套純函式，確保離線展示與線上正式環境數字 100% 一致。

---

## 2. Cloud Firestore 集合結構

| 集合名稱 | Document ID | 用途 | 寫入權限 |
| :--- | :--- | :--- | :--- |
| `allowlist` | `email`（全小寫） | Google 登入白名單與 O(1) Security Rules 角色查表 | `ADMIN` |
| `users` | `user.id` | 系統人員帳號、角色 (`ADMIN`/`BU_HEAD`/`AM`)、所屬 `orgId` 與登入中繼資料 | `ADMIN`（本人僅可更新 `authUid`/`photoURL`/`lastLoginAt`） |
| `organizations` | `org.id` | 多層級部門樹 (`parentId`) | `ADMIN` |
| `stages` | `stage.id` | 管線階段與 `outcome` (`OPEN`/`WON`/`LOST`) | `ADMIN` |
| `activityTypes` | `type.id` | 活動類型與量化單價 (`unitCost`) | `ADMIN` |
| `budgetItems` | `item.id` | 商機費用預算科目 | `ADMIN` |
| `companies` | `comp.id` | 客戶公司基本資料 | 已授權使用者 |
| `contacts` | `contact.id` | 客戶聯絡窗口名冊 | 已授權使用者 |
| `productLines` | `prod.id` | 產品線清單 | 已授權使用者 |
| `salesTargets` | `YYYY-MM` | 各月份全公司銷售目標金額 | `ADMIN` / `BU_HEAD` |
| `opportunities` | `opp.id` | 商機主檔（含排程 `schedules` 與預算 `budgets`） | `ADMIN`/`BU_HEAD` 全部；`AM` 僅限本人 `userId` |
| `activities` | `act.id` | 互動歷程與待辦任務 | `ADMIN`/`BU_HEAD` 全部；`AM` 僅限本人 `userId` |

---

## 3. 身分驗證與 RBAC 權限設計

1. **Google 帳號驗證（Authentication）**：
   使用者透過 Firebase Auth Google Popup 登入取得已驗證 Email（`email_verified == true`）。
2. **白名單與角色綁定（Authorization）**：
   前端登入後透過 `allowlist/{emailLower}` 對應至 `users/{userId}`。若該 Email 未列於 `allowlist`，前端顯示未授權畫面並拒絕進入系統，後端 `firestore.rules` 亦同步阻擋所有資料讀取。
3. **三級 RBAC 角色**：
   - **`ADMIN`（系統管理員）**：全公司資料讀寫、銷售階段設定、組織樹與人員管理、預算科目、活動單價設定。
   - **`BU_HEAD`（部門主管）**：依所屬 `orgId` 向下檢視整棵子部門樹的商機與報表、設定月度目標、維護客戶與產品線。
   - **`AM`（業務代表）**：僅可查詢與編輯 `userId` 為自己的商機與活動（Firestore 查詢與 Security Rules 雙重強制隔離），並可維護客戶與產品線資料。
