這是一份為 AI 開發代理 (AI Agent) 量身打造的結構化軟體開發規格與架構設計書定稿。這份文件涵蓋了核心資料模型、功能細節與系統架構，能讓負責前端與後端的 AI 系統或開發團隊直接展開實作。

B2B CRM 系統需求與架構設計書 (SRS & Architecture Design)
1. 系統概述與專案邊界
本專案旨在建立一個 Web 介面的 B2B 客戶關係管理系統，提供業務團隊追蹤商機、管理任務及檢視銷售數據分析。
包含範圍 (In-Scope)：可自訂階段的商機管線 (Pipeline)、活動與任務管理、視覺化數據分析儀表板、基礎 RBAC 角色權限控制。
排除範圍 (Out-of-Scope)：ERP進銷存系統整合、複雜行銷自動化發信、合約報價單 PDF 自動生成（規劃於未來階段）。
2. 核心資料模型設計 (Entity-Relationship Diagram)
為了讓後端服務能直接建立資料庫綱要 (Schema)，以下規劃了 PostgreSQL 的核心實體關聯圖。特別針對需求，將「銷售階段 (Stage)」獨立為可動態調整的資料表。
erDiagram
    USERS {
        uuid id PK
        string name
        string email
        string role ADMIN, MANAGER, SALES
    }
    COMPANIES {
        uuid id PK
        string name
        string industry
        timestamp created_at
    }
    CONTACTS {
        uuid id PK
        uuid company_id FK
        string name
        string email
        string phone
    }
    OPPORTUNITIES {
        uuid id PK
        uuid company_id FK
        uuid user_id FK 負責業務
        uuid stage_id FK 目前所處階段
        string title
        numeric amount 預估金額
        int win_probability 贏率 0-100
        date expected_close_date
    }
    STAGES {
        uuid id PK
        string name 如 需求訪談, 報價
        int display_order 排序
        boolean is_active 是否啟用
    }
    ACTIVITIES {
        uuid id PK
        uuid opportunity_id FK
        uuid user_id FK
        string type MEETING, EMAIL, CALL, TASK
        text description
        timestamp due_date 任務到期日
        boolean is_completed
    }

    USERS --o{ OPPORTUNITIES  owns
    USERS --o{ ACTIVITIES  performs
    COMPANIES --{ CONTACTS  has
    COMPANIES --o{ OPPORTUNITIES  has
    STAGES --o{ OPPORTUNITIES  categorizes
    OPPORTUNITIES --o{ ACTIVITIES  tracks

3. 功能性需求與 API 介面設計 (RESTful)
3.1 商機與管線管理 (Pipeline & Opportunities)
業務邏輯：系統需支援以 Kanban 拖曳方式改變商機的 stage_id。管理員可對 STAGES 資料表進行 CRUD 操作，以隨時新增、刪減或調整銷售階段的排序。
關鍵 API 端點：
GET apiv1stages - 取得目前啟用的銷售階段與排序。
POST apiv1stages - (限 Admin) 新增自訂銷售階段。
PUT apiv1opportunities{id}stage - 更新商機狀態（拖曳看板時觸發）。
3.2 活動與任務紀錄 (Activities & Tasks)
業務邏輯：每個商機可綁定多筆互動歷程或未來任務。未完成且 due_date 接近的任務，應推送至使用者的首頁待辦清單。
關鍵 API 端點：
POST apiv1opportunities{id}activities - 新增對應商機的聯繫紀錄或待辦任務。
GET apiv1users{id}tasksstatus=pending - 取得業務個人的待辦事項。
3.3 數據分析儀表板 (Dashboard)
業務邏輯：讀取 OPPORTUNITIES 與 STAGES 的關聯資料，計算各階段的總預估金額與數量，並計算銷售漏斗的轉換率。
關鍵 API 端點：
GET apiv1analyticsfunnel - 獲取銷售漏斗聚合數據。
GET apiv1analyticskpi - 獲取預估業績、任務完成率等指標。
4. 非功能性需求規範
前端介面 (RWD)：必須採用響應式設計，確保 Pipeline 看板在平板與桌機上均能平滑拖曳，手機版則自動轉換為列表或堆疊式卡片設計。
權限控制 (RBAC)：
SALES：僅能對 user_id 為自己的商機與任務進行寫入與修改，僅能檢視自己的數據。
MANAGER  ADMIN：可檢視全公司數據；僅 ADMIN 有權限修改 STAGES 設定。
5. 系統架構設計 (System Architecture)
採用前後端分離 (SPA + RESTful API) 架構，確保系統高可用性及未來擴展性。
graph TD
    subgraph Frontend_SPA [前端應用 (ReactVue)]
        UI_Kanban[Pipeline 看板元件n(Drag & Drop)]
        UI_Task[活動與任務元件]
        UI_Dash[數據分析圖表n(Chart.js  ECharts)]
        UI_Settings[後台設定元件n(自訂銷售階段)]
    end

    subgraph Backend_Services [後端 API 服務 (Node.jsPython)]
        Auth_Middleware[JWT 身分驗證與 RBAC]
        API_Pipeline[商機與階段控制器]
        API_Activity[任務與活動控制器]
        API_Analytics[數據聚合引擎]
    end

    subgraph Infrastructure [基礎設施]
        DB[(PostgreSQL)]
        Cache[(Redis - 可選，用於快取儀表板)]
    end

    %% 資料流向
    UI_Kanban --REST  JSON Auth_Middleware
    UI_Task --REST  JSON Auth_Middleware
    UI_Dash --REST  JSON Auth_Middleware
    UI_Settings --REST  JSON Auth_Middleware

    Auth_Middleware -- API_Pipeline
    Auth_Middleware -- API_Activity
    Auth_Middleware -- API_Analytics

    API_Pipeline -- DB
    API_Activity -- DB
    API_Analytics -- DB
    API_Analytics -.- Cache

6. 建議技術堆疊
這套規格可以直接交由 AI 產生對應的程式碼，建議採用的實作技術如下：
前端：React.js (搭配 TypeScript 確保資料型別安全)，使用 @hello-pangeadnd 或類似庫實作拖曳，使用 Tailwind CSS 處理響應式排版。
後端：Node.js (Express 或 NestJS) 或 Python (FastAPI)，強烈建議使用 ORM (如 Prisma, TypeORM, 或 SQLAlchemy) 來對應上述的 ERD 模型。
資料庫：PostgreSQL (容器化部署)。

