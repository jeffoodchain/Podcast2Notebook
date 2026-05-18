# Podcast2Notebook 使用說明

把一集 podcast(RSS feed、單集網址、直接的音檔連結,或上傳的音檔)轉成:逐字稿、
NotebookLM 來源檔、摘要 / 筆記、`.pptx` 簡報、心智圖。

應用由**兩個服務**組成:Next.js 網頁應用 + Python 轉錄服務(`faster-whisper`)。
最簡單的跑法是用 Docker 一個指令全部啟動。

---

## 1. 快速開始(Docker,推薦)

只需要安裝 **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**。

```bash
# 1. 準備設定檔(金鑰都是選填的)
cp .env.example .env

# 2. 一個指令,啟動前端 + 後端 + 轉錄模型
docker compose up --build
```

開 **http://localhost:3000** 就能用。

- **首次啟動**會下載 whisper 語音模型(`small`,約 460MB),需等一兩分鐘;模型會快取在
  Docker volume,之後啟動就很快。
- 停止:在終端機按 `Ctrl+C`,或另開終端機執行 `docker compose down`。
- 改了程式碼要重建:`docker compose up --build`。

金鑰是選填的 —— 不填也能用(只是少了 AI 校正 / Drive 上傳)。要用就編輯 `.env`,
取得方式見第 4、5 節。

---

## 2. 手動安裝(不用 Docker,開發用)

### 系統需求

| 項目 | 版本 |
|------|------|
| Node.js | 18 以上 |
| Python | **3.13**(請勿用 3.14 — `ctranslate2` 尚無 3.14 的 wheel) |

### 步驟

```bash
# Node 套件
npm install

# Python 轉錄服務
cd python-service
python3.13 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ..

# 設定檔
cp .env.example .env
```

啟動(需要**兩個終端機**):

```bash
# 終端機 1 — Python 轉錄服務(:8000)
cd python-service && ./venv/bin/python main.py

# 終端機 2 — Next.js 應用(:3000)
npm run dev
```

> ⚠️ 不要在 `npm run dev` 還在跑的時候執行 `npm run build` —— 兩者都會寫 `.next/` 目錄、
> 會互相破壞。要做 production build 請先停掉 dev server。

---

## 3. 環境變數

複製 `.env.example` 成 `.env` 後編輯。全部都是**選填**,沒設定的功能會優雅停用。

| 變數 | 預設 | 說明 |
|------|------|------|
| `GEMINI_API_KEY` | (空) | 設了才會啟用 AI 逐字稿校正。取得方式見第 4 節 |
| `GEMINI_MODEL` | `gemini-2.5-flash` | 校正模型;想更快可用 `gemini-2.5-flash-lite` |
| `GEMINI_BATCH_SIZE` | `120` | 每次請求送幾段字幕 |
| `GEMINI_CONCURRENCY` | `4` | 平行請求數;免費層金鑰請調低 |
| `OPENAI_API_KEY` | (空) | 設了就改用 OpenAI API 轉錄(不需本地 Python 服務);沒設則用本地服務 |
| `OPENAI_TRANSCRIBE_MODEL` | `whisper-1` | OpenAI 轉錄模型;`whisper-1` 會回傳含時間戳的 segments |
| `GOOGLE_OAUTH_CLIENT_ID` | (空) | 設了才會啟用 Google Drive 上傳。取得方式見第 5 節 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | (空) | 同上 |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | 應用網址;OAuth 重新導向 URI 由此推算 |
| `TRANSCRIPTION_SERVICE_URL` | `http://localhost:8000` | 本地轉錄服務位址(用 Docker 時 compose 會自動設定,不用管) |
| `WHISPER_MODEL_SIZE` | `small` | 本地轉錄模型大小:`tiny`/`base`/`small`/`medium`/`large-v3`,越大越準也越慢 |

### 轉錄引擎:本地 或 OpenAI

轉錄有兩種模式,自動依 `OPENAI_API_KEY` 切換:

- **沒設 `OPENAI_API_KEY`** → 用本地 `faster-whisper`(免費,但吃 CPU、慢,需要跑 Python 服務)
- **有設 `OPENAI_API_KEY`** → 改用 OpenAI API 轉錄(快、較準,約 $0.006/分鐘音檔)。
  此模式**完全不需要 Python 轉錄服務** —— 部署時只要跑 Next.js 一個服務即可,
  很適合 Zeabur 這類平台。長音檔會自動先用 ffmpeg 降頻壓縮以符合 OpenAI 的 25MB 上限。

---

## 4. 如何取得 `GEMINI_API_KEY`(AI 逐字稿校正)

語音轉文字會有同音字、專有名詞辨識錯誤、標點不佳等問題。開啟「AI 校正」後,系統會用
Google Gemini 逐批校正,**只修正辨識錯誤、不改寫語意**;任何批次失敗(沒金鑰、額度不足)
會自動退回原文,不會中斷流程。

取得金鑰:

1. 用 Google 帳號登入 **[Google AI Studio — API keys](https://aistudio.google.com/apikey)**。
2. 點 **Create API key**,選一個 Google Cloud 專案(或讓它新建)。
3. 複製金鑰(以 `AIza` 開頭),填入 `.env` 的 `GEMINI_API_KEY`。
4. 重啟服務。

**免費層 vs 付費層**:免費層拿到就能用,但每分鐘請求數很低(約 20 次),長逐字稿容易被
限流(系統會自動退避重試,只是較慢)。要快就到**該金鑰所屬的 Google Cloud 專案**連結
帳單升級付費層 —— 注意付費層級是綁「專案」的。

---

## 5. 如何設定 Google Drive 上傳(OAuth)

開啟「存到 Google Drive」後,使用者用自己的 Google 帳號登入,產出檔會存進**他自己的**
雲端硬碟(自動建立的 `Podcast2Notebook/<單集名>` 資料夾)。權限只要 `drive.file` —— app
只能碰自己建立的檔案。

### 5.1 一次性設定(開發者)

在 [Google Cloud Console](https://console.cloud.google.com):

1. 選一個專案 → 啟用 **Google Drive API**。
2. **OAuth 同意畫面 / Audience**:User Type 選 *External*;填應用名稱;把要使用的人的
   Gmail 加進 **Test users**(app 維持 *Testing* 狀態即可,測試者立即可用,上限 100 人)。
3. **憑證(Credentials)** → 建立 **OAuth 用戶端 ID** → 類型選 **網頁應用程式** →
   在「已授權的重新導向 URI」新增(完全照貼):
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. 按建立後會彈出視窗顯示 **Client ID** 與 **Client Secret**,兩個都複製。
   (關掉了的話,回「憑證」頁點該用戶端名稱,詳情頁裡都有。)
5. 填進 `.env`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxx
   ```
6. 重啟服務。

### 5.2 使用者操作

在處理選項把「存到 Google Drive」打開 → 下方出現 **連結 Google Drive** →
點擊 → Google 同意畫面按允許 → 顯示「已連結 Drive」。之後處理的檔案就會自動上傳。

> 沒設定 OAuth 金鑰時,Drive 功能會自動停用,介面顯示「尚未設定」。

---

## 6. 使用方式

頁面是引導式的三步驟:

1. **選擇來源** — 切到「貼連結」貼上 podcast 連結,或切到「上傳音檔」選檔案。
2. **處理選項** — 用開關決定是否「AI 校正逐字稿」、是否「存到 Google Drive」。
3. **開始處理** — 按下後會依序顯示進度:解析來源 → 下載音檔 → 轉錄音檔 →
   AI 校正 → 產生筆記。完成後自動捲到下方的「產出檔案」。

產出檔案可單獨下載或「全部下載」。要送進 NotebookLM 見第 7 節。

> 本地 CPU + `small` 模型:轉錄一集約 50 分鐘的 podcast 約需 20+ 分鐘,屬正常。
> 想加快可改小 `WHISPER_MODEL_SIZE`。

---

## 7. 上傳到 NotebookLM

NotebookLM **沒有公開的消費者 API**(唯一的程式介面是企業版 NotebookLM Enterprise API,
需 Gemini Enterprise 授權),所以是手動上傳:

1. 在「產出檔案」的「上傳到 NotebookLM」區塊點 **1. 下載來源檔**,取得 `notebooklm_source.md`。
2. 點 **2. 開啟 NotebookLM**,在 NotebookLM 建立或開啟筆記本,把該檔案加為來源。

不需要任何 API key。

---

## 8. 運作架構(簡述)

- **非同步 job 模型**:`POST /api/jobs` 建立 job、背景處理、立即回傳 `jobId`;前端每 2 秒
  輪詢 `GET /api/jobs/[id]`。長時間轉錄不會卡在 HTTP timeout。
- **pipeline 階段**:`parsing → downloading → transcribing → refining → generating → completed`。
- **轉錄序列化**:`faster-whisper` 吃 CPU,多個 job 會排隊,一次只轉錄一個。
- **產出檔**存在 `uploads/`(Docker 下是共用 volume),透過 `/api/files/...` 路由提供下載。
- **轉錄快取**:每個音檔的結果快取成 `<音檔>.json`,以檔案大小 + mtime 簽章驗證。

---

## 9. 疑難排解

| 症狀 | 原因 / 解法 |
|------|------------|
| `docker compose` 報 `Cannot connect to the Docker daemon` | Docker Desktop 沒啟動 — 先把它打開 |
| 首次 `docker compose up` 卡很久 | 正在下載 whisper 模型(~460MB),屬正常,只有第一次 |
| `pip install` / `ctranslate2` 裝不起來(手動安裝)| Python 版本太新,請用 **Python 3.13** 建 venv |
| 網頁出現 `Cannot find module './xxx.js'` | `.next` 快取損毀。停掉 dev → `rm -rf .next` → 重啟 |
| 轉錄失敗 /「Transcription service is unreachable」 | 手動模式下 Python 服務沒啟動;Docker 模式下首次模型還在下載,稍候再試 |
| AI 校正沒作用 | 沒設 `GEMINI_API_KEY`,或被免費層限流(見第 4 節) |
| 轉錄很慢 | 本地 CPU 的正常現象。改小 `WHISPER_MODEL_SIZE` 或用 GPU |
| Drive 顯示「尚未設定」 | 沒填 `GOOGLE_OAUTH_CLIENT_ID` / `SECRET`,或填完沒重啟 |
| OAuth 出現 `redirect_uri_mismatch` | GCP 登記的重新導向 URI 要**完全等於** `http://localhost:3000/api/auth/callback/google` |
| OAuth 出現 `access_denied` / 未完成驗證 | 你的 Gmail 不在 OAuth 同意畫面的 Test users 名單裡 |

---

## 10. 部署到 Zeabur

Zeabur 不吃 `docker-compose.yml` —— 要把**兩個服務分別部署**在同一個 Zeabur 專案裡。

### 10.1 建立兩個服務

1. **web 服務** —— 從這個 repo 部署,Zeabur 會用根目錄的 `Dockerfile`(Next.js 應用)。
2. **transcription 服務** —— 同一個 repo 再加一個服務,把它的「Root Directory」設成
   `python-service`,Zeabur 就會用 `python-service/Dockerfile` 建置。

### 10.2 連接兩個服務

音檔是透過 HTTP 上傳給轉錄服務的,**兩個服務不需要共用磁碟**。它們用 Zeabur 的私有
網路互連(同專案的服務以服務名稱當 hostname)。在 **web 服務**設定:

```
TRANSCRIPTION_SERVICE_URL = http://<transcription 服務名稱>:8000
```

(實際的內部位址請看 Zeabur 該服務的 Networking 面板。)

### 10.3 web 服務的其他環境變數

- `NEXT_PUBLIC_APP_URL` = web 服務的對外網址(Zeabur 給的 domain)
- `GEMINI_API_KEY` / `GEMINI_MODEL` —— 要用 AI 校正才需要
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` —— 要用 Drive 才需要

用 Drive 的話,記得到 GCP 把 `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google`
加進 OAuth 的「已授權重新導向 URI」。

### 10.4 transcription 服務建議

- 至少給 **1–2GB RAM**(whisper 模型常駐約 0.5–1GB)
- 掛一個 Volume 到 `/root/.cache/huggingface`,模型才不會每次重啟都重新下載
- CPU 轉錄很慢,長集數要等很久

### 部署通則

- pipeline 是背景 fire-and-forget,只能跑在長存活的程序(容器),**不能**用 serverless。
- job 狀態存在記憶體,只適用單一程序;要跑多副本請改用 Redis 等外部儲存。
- 產出檔存在容器本機的 `uploads/`,容器重建會清空;正式環境建議改接物件儲存
  (S3 / R2 / GCS)。
- 自架 CPU whisper 又慢又吃資源。要做成多人服務,可考慮改用轉錄 API
  (如 Groq whisper-large-v3、OpenAI `gpt-4o-transcribe`),讓伺服器只負責協調。
