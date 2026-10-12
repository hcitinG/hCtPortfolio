# hCt 作品集：Firebase 線上後台版

此版本包含完整前台、Google 登入頁與線上作品編輯介面，保留目前 64 件作品與設定。網站程式部署在 GitHub Pages；登入、作品資料及新素材由 Firebase 處理。

## 上傳

解壓 hCt-Firebase-GitHub-Upload.zip，將裡面的檔案與資料夾直接放在作品集 repository 的發布根目錄，index.html 必須位於根目錄。保留 admin/、runtime/、shared/、assets/、work/ 與 .nojekyll。無需安裝套件或執行 build。不要將整個 ZIP 當成網頁上傳。

若使用完整包 hCt-Firebase-Complete.zip，只將 GitHub-upload/ 內的內容上傳 GitHub；Firebase-setup/ 的規則與設定說明用於 Firebase Console，保留在電腦。

## 第一次設定

你提供的公開 Firebase 網站設定已放入 firebase-config.js；它不包含密碼或私鑰。仍需依完整包 Firebase-setup/Firebase-setup-guide.md 啟用 Google Authentication、授權網站網域、建立 Firestore 與 Storage，並套用管理員專用規則。填入管理員 Email 的步驟由你自行完成，不需提供帳密。

## 進入後台

從網站底部黑色 About 區塊的 Admin 進入，或開啟 admin/index.html。Google 登入僅識別帳號；Firebase 規則只授權你指定且已驗證的 Email，網站不提供自行註冊管理員。

第一次登入後按「儲存草稿」再按「發布網站」，讓公開網站使用這份內容。以後上傳／編輯作品、儲存草稿並發布即可更新，觀看中的公開網頁重新整理後取得新版，不需每次重傳 GitHub。修改版型或網站程式才需要更新 GitHub 檔案。

新增作品使用 work.html?id=作品ID；work/ 內保留原作品網址，舊連結仍可使用。

## 檢查範圍

檔案、相對路徑、語法及本機資料流程已檢查。Firebase 雲端服務與規則尚未代為部署，真實 Google 登入、非管理員拒絕、圖片上傳與發布需完成設定後再驗證。
