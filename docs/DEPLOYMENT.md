# EzCRM Firebase 部署與維運指南

本指南說明如何將 EzCRM 部署至自己的 Firebase 專案（**完全相容免費 Spark 方案**，無需升級付費即可使用 Hosting + Authentication + Cloud Firestore）。

---

## 1. 事前準備

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立專案（或使用現有專案）。
2. 啟用以下服務：
   - **Authentication → Sign-in method**：啟用 **Google** 登入供應商，並設定專案支援電子郵件；確認「Authorized domains」包含你的 `*.web.app` 網域（以及本機測試用的 `localhost`）。
   - **Firestore Database**：建立 Standard Edition 資料庫（建議選擇鄰近區域，例如台灣 `asia-east1`）。
3. 在「專案設定 → 一般」新增一個 **Web 應用程式**，取得 `firebaseConfig`。

---

## 2. 設定環境變數

複製範本建立 `.env.local`（此檔案已列入 `.gitignore`，切勿提交至 Git）：

```bash
cp .env.example .env.local
```

填入你的 Firebase Web 設定：

```env
VITE_CLEAN_START=true
VITE_DEFAULT_VARIANT=A
VITE_SHOW_VARIANT_SWITCHER=false

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 3. 建置與部署指令

```bash
# 登入 Firebase CLI
npx -y firebase-tools@latest login

# 綁定專案（建議於專案目錄建立本地 .firebaserc，已被 gitignore）
npx -y firebase-tools@latest use your-project-id

# 1. 部署 Firestore Security Rules 與索引
npx -y firebase-tools@latest deploy --only firestore

# 2. 建置前端正式包並部署 Hosting
npm run build
npx -y firebase-tools@latest deploy --only hosting
```

---

## 4. 初始化第一位管理員 (Bootstrap Admin)

全新資料庫尚未有任何使用者時，請在 **Firestore Database** 手動建立以下兩筆初始文件（可於 Firebase Console 介面新增）：

1. **`users/admin-init`**：
   ```json
   {
     "id": "admin-init",
     "name": "系統管理員",
     "email": "admin@yourcompany.com",
     "role": "ADMIN",
     "orgId": null
   }
   ```
2. **`allowlist/admin@yourcompany.com`**（Document ID **必須為全小寫 Email**）：
   ```json
   {
     "userId": "admin-init",
     "email": "admin@yourcompany.com",
     "name": "系統管理員",
     "role": "ADMIN",
     "orgId": null
   }
   ```

完成後，以 `admin@yourcompany.com` 登入部署網址，系統會自動建立預設的 6 個銷售階段與 4 個活動類型。

---

## 5. 日常新增與管理團隊成員

第一位管理員登入後，**無須再回到 Firebase Console 建立帳號**：

1. 進入左側選單 **「系統設定 → 人員帳號管理」**。
2. 點擊 **「新增使用者」**，填入同事姓名、**Google 帳號 Email**、角色（`ADMIN` / `BU_HEAD` / `AM`）與部門。
3. 儲存時系統會自動同步寫入 `users` 與 `allowlist`。該成員即可直接前往網址點選「使用 Google 帳號登入」開始使用。
4. 若需停用成員存取權，直接在「人員帳號管理」刪除該帳號（或先轉移其名下商機後刪除），系統會即時移除其白名單。
