# hCtPortfolio — GitHub Pages optimized version

以原 WordPress 作品集頁面為內容與色彩基礎，重新整理成較現代的 editorial portfolio 視覺，保留灰、霧白與低飽和玫瑰紅的原站識別。

## 本版調整

- 首屏改為大字編排與分段載入動畫，保留 `HUANG CI TING / 作 品 展 示`
- 分類列改成 sticky / blur 導覽，分類數量自動計算
- 作品 masonry 重新排版：桌機 3 欄、平板 2 欄、手機 1 欄
- 篩選加入平滑位移、淡出與 blur 過場
- 卡片加入 viewport reveal、圖片微縮放、操作標記與更乾淨的資訊層級
- Lightbox 過場、背景、標題、頁碼與循環瀏覽重新調整
- 加入頁面 scroll progress 與 Back to Top
- 支援 `prefers-reduced-motion`，降低動態敏感使用者的動畫量
- 列表圖使用 `assets/thumbs/*.webp`，Lightbox 仍讀 `assets/images/*` 原始大圖
- 圖片加入 width / height、lazy loading、decoding 與前幾張圖的 priority 設定，降低版面跳動
- 修正 `網站版型設計-糕餅業` 遺失「網站視覺」分類的搬遷錯誤

## GitHub Pages

把本資料夾內所有檔案放在 repository 根目錄：

- `index.html`
- `css/`
- `js/`
- `assets/`
- `portfolio-manifest.json`

GitHub → Settings → Pages → Deploy from a branch → `main` / `/(root)`。

所有路徑均使用相對路徑，可直接部署在 GitHub Pages repository path 下。
