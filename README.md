# hCt：GitHub 圖片＋Firebase 免費方案

完整前台與線上後台，保留 64 件真實作品與目前定案的網站設計。

網站與新作品圖片放在 GitHub；Google 登入、作品文字、設定與發布使用 Firebase Spark。**不需要 Firebase Storage、Blaze 或付款資料。** 免費服務仍有容量與用量上限。

解壓 hCt-Free-GitHub-Upload.zip，將所有檔案與資料夾直接放入原作品集發布根目錄，index.html 在根目錄；保留 .nojekyll、github-config.js、firebase-config.js、admin/、runtime/、shared/、assets/、work/。不要上傳 ZIP 本身。完整保存包中只有 GitHub-upload/ 的內容要上傳；Setup/ 保留在電腦。

先依完整包 Setup/Setup-guide.md 啟用 Firebase Google 登入、授權 hciting.github.io、建立 (default) Firestore，並在 firestore.rules 自行填入管理員 Email、發布規則。不要啟用 Storage。

入口是黑色 About 區塊左下角 Admin，或 admin/index.html。首次登入後儲存草稿並發布網站。Google 登入不會讓其他帳號自動成為管理員。

上傳新圖片前，在 GitHub 建立 Fine-grained personal access token，只授權 hCtPortfolio 儲存庫的 Contents Read and write，然後在後台「GitHub 圖片連線」自行輸入。授權碼只保留在目前分頁記憶體；重新整理、關閉或登出後需重新輸入，不放入這個 README、公開設定、Firebase 或備份。

圖片上傳至公開儲存庫 assets/uploads/；作品文字在發布前仍是私人草稿。圖片使用 commit 固定網址。支援 PNG、JPG、WebP、GIF、MP4、WebM，每檔最多 25 MB。日常新增作品與文字更新不需要重傳整份網站。

這份程式與本機模擬流程已檢查；Firebase 規則尚未代為部署，也尚未以你的 GitHub 授權完成真實上傳。仍需按照設定說明完成一次登入、權限、上傳與公開發布驗證。
