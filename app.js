/* ==========================================================================
   JobFlow AI v2 - Core Application Controller
   ========================================================================== */

// --------------------------------------------------------------------------
// 1. Initial State & Storage Keys
// --------------------------------------------------------------------------
const STORAGE_KEYS = {
  JOBS: 'jobflow_jobs',
  EXPERIENCES: 'jobflow_experiences',
  SETTINGS: 'jobflow_settings',
  LOGS: 'jobflow_sync_logs',
  STATS: 'jobflow_stats',
  RESUME: 'jobflow_resume'
};

let state = {
  jobs: [],
  experiences: [],
  settings: {
    engineMode: 'mock',
    geminiKey: '',
    claudeKey: '',


    webhookUrl: '',
    lineToken: '',
    email: '',
    keywords: [
      { id: 'kw-1', cat: '管顧', query: '顧問實習 Consulting' },
      { id: 'kw-2', cat: '資料分析', query: '數據分析 Data Analyst' },
      { id: 'kw-3', cat: 'AI 產品', query: 'AI 產品經理 Product Manager' }
    ]
  },
  logs: [],
  activeTab: 'dashboard',
  activeExperienceId: null,
  activeOutputTab: 'resume',
  interviewChatHistory: {}, // JobId -> array of messages
  resume: {}, // store uploaded resume text
  generatedDocs: {} // store AI generated outputs per job
};

// --------------------------------------------------------------------------
// 2. Mock Data Definitions & Templates (for instant wow factor)
// --------------------------------------------------------------------------
const SEED_DATA = {
  experiences: [
    {
      id: 'exp-seed-1',
      title: '管顧社專案組長 (Consulting Club Leader)',
      org: '國立台灣大學管理顧問社',
      role: '專案組長 (Project Lead)',
      period: '2025.09 - 2026.01',
      tag: '管顧',
      skills: 'MECE, 邏輯思考, 商業開發, 簡報提案',
      starS: '帶領 5 人學生小組，為一家本土連鎖餐飲企業解決獲利衰退問題。該企業面臨主要競爭對手擴店，利潤於半年內下滑 15%。',
      starT: '在 3 個月內找出獲利衰退的核心原因，並向該企業總經理進行 30 分鐘決策提案，推動商業模式轉型。',
      starA: '運用 MECE 架構將衰退問題拆解為「營收端（客單價、來客數）」與「成本端（食材、租金、人力）」。設計問卷回收 600 份並進行消費者訪談，發現主要痛點為菜單無特色且非尖峰時段閒置率高。隨後推動「午茶時段共享空間」與「高毛利副餐加購」策略。',
      starR: '成功獲總經理採納並於 2 家試點店面實施，使試點店面非尖峰時段營收提升 22%，客單價平均提高 12%，專案提案獲得社團年度最佳專案獎。'
    },
    {
      id: 'exp-seed-2',
      title: '電商數據分析實習生 (Data Analyst Intern)',
      org: '蝦皮購物 (Shopee)',
      role: '數據分析實習生',
      period: '2025.07 - 2025.09',
      tag: '資料分析',
      skills: 'SQL, Python, Tableau, A/B Testing, 漏斗分析',
      starS: '公司發現雙 11 大促前夕，購物車到結帳完成的轉換率（Checkout Funnel）異常下滑 5%，影響潛在營收達百萬台幣。',
      starT: '定位流失發生的具體步驟，找出流失主因並協同產品經理優化結帳頁面，目標將結帳轉換率回升至正常水平。',
      starA: '使用 SQL 撈取每日 50 萬筆使用者結帳路徑行為，在 Tableau 中建立漏斗看板。透過 Python 進行用戶特徵與載具相關性分析，發現使用 iOS 系統且選擇「超商取貨」的用戶在地址輸入頁面流失最嚴重。深入測試發現是由於新版 App 的地圖 API 載入延遲，導致用戶不耐煩跳出。',
      starR: '推動地圖快取優化與簡化地址輸入步驟，經過 A/B Testing 驗證，使 iOS 用戶超商取貨結帳轉換率提升 8.5%，整體結帳漏斗流失率降低 18%，挽回雙 11 大促預估營收約 120 萬台幣。'
    },
    {
      id: 'exp-seed-3',
      title: '生成式 AI 產品助理實習生 (AI PM Intern)',
      org: '聯發科技 (MediaTek)',
      role: 'AI 產品助理實習生',
      period: '2025.02 - 2025.07',
      tag: 'AI 產品',
      skills: 'PRD 撰寫, LLM 提示工程, 使用者研究, 競品分析',
      starS: '部門計畫針對內部工程師推出一個「代碼生成與技術文檔檢索助理」MVP，以縮短研發人員尋找內部 API 文檔的時間。',
      starT: '負責協調 3 位軟體工程師，在 5 個月內完成產品需求文檔 (PRD)，並設計一套 Prompt 評估體系優化 RAG (檢索增強生成) 的精準度。',
      starA: '對 30 名研發進行訪談，定義出「代碼排錯」與「SDK調用」兩大核心場景。撰寫完整 PRD，建立以 200 個真實查詢為基礎的基準測試集 (Benchmark)。優化 system prompt 與 RAG 的檢索權重，改善 LLM 幻覺，並引入單擊複製程式碼與文檔來源標註功能。',
      starR: '產品上線後供 500+ 名研發人員使用，文檔檢索首頁滿意度由 60% 提升至 88%，研發人員平均查閱技術文檔的時間縮短 25%，每週節省約 4 小時/人的工作量。'
    }
  ],
  jobs: [
    {
      id: 'job-seed-1',
      title: 'Business Analyst Intern (商業分析師實習生)',
      company: 'McKinsey & Company (麥肯錫)',
      cat: '管顧',
      status: 'tailoring',
      deadline: '', // Calculated dynamically to be 18 hours from now
      source: 'LinkedIn 關鍵字訂閱',
      jd: `【Job Description】
McKinsey & Company is looking for Business Analyst Interns to join our Taipei office. You will work alongside our consultants to solve complex client issues, structure problems, and deliver impactful recommendations.

【Qualifications & Requirements】
- Strong analytical and quantitative problem-solving skills
- Demonstrated leadership experience in academic or professional settings
- Ability to work collaboratively in team environments and communicate complex ideas structuredly
- Familiarity with business frameworks (MECE, Porter's Five Forces, 3Cs) is highly preferred
- Fluent in English and Mandarin`
    },
    {
      id: 'job-seed-2',
      title: '商業智慧與數據分析實習生 (BI & Data Intern)',
      company: 'TSMC (台積電)',
      cat: '資料分析',
      status: 'inbox',
      deadline: '', // Calculated dynamically to be 3 days from now
      source: '104 關鍵字訂閱',
      jd: `【工作職責】
1. 協助維護與優化台積電內部業務與供應鏈相關 Tableau 報表。
2. 使用 SQL 進行大規模數據庫查詢、清洗與特徵工程，產出定期商業報告。
3. 協助各部門進行 A/B 測試數據收集與轉化率成效追蹤。
4. 參與跨部門會議，將數據分析發現轉化為具體的商務營運優化建議。

【基本條件】
- 商管、工管、資管或統計相關科系碩士在學（碩一尤佳）。
- 具備優秀的 SQL 撰寫能力（熟悉 Join, Aggregations, Window Functions）。
- 熟悉 Tableau 或 Power BI 等視覺化軟體。
- 擁有 Python 數據處理（Pandas, Numpy）經驗者加分。`
    },
    {
      id: 'job-seed-3',
      title: 'GenAI 產品經理實習生 (GenAI PM Intern)',
      company: '聯發科技 (MediaTek)',
      cat: 'AI 產品',
      status: 'ready',
      deadline: '', // Calculated dynamically to be 1.5 days from now
      source: '104 關鍵字訂閱',
      jd: `【Job Description】
Join the MediaTek AI Product Team to shape the future of edge and cloud intelligence. As a GenAI PM Intern, you will help design and launch AI-driven developer productivity widgets and internal tools.

【Responsibilities】
- Conduct market research and user interviews to define PRDs for Generative AI search and chatbot products.
- Work closely with LLM engineers and UI/UX designers to design prompts, test retrieval strategies (RAG), and map user flows.
- Track post-launch telemetry, usage metrics, and user feedback to iterate features.

【Requirements】
- Master's student in Business (MBA/MGB) or Computer Science.
- Basic understanding of Generative AI concepts (LLM, Prompt engineering, RAG).
- Strong empathy for users and excellent communication skills.
- Technical background or experience collaborating with developers is a plus.`
    }
  ]
};

// --------------------------------------------------------------------------
// 3. Pre-baked AI generation content for seed jobs (Mock Mode fallback)
// --------------------------------------------------------------------------
const MOCK_GENERATIONS = {
  'job-seed-1': {
    resume: `### 🎯 針對【McKinsey - Business Analyst Intern】的履歷優化建議

本職缺高度看重 **「結構化思考 (MECE)」**、**「領導力與團隊協同」** 以及 **「向高層匯報的能力」**。系統已自動篩選你的 **【管顧社專案組長】** 經歷作為主打素材，以下是 AI 幫你優化後的 STAR 描述對照：

---

#### 📌 經歷一：國立台灣大學管理顧問社 - 專案組長 (Project Lead)

* **Situation (情境) 優化**：
  * **原句**：帶領 5 人學生小組，為一家本土連鎖餐飲企業解決獲利衰退問題。該企業面臨主要競爭對手擴店，利潤於半年內下滑 15%。
  * **優化後**：<span class="highlight-ins">領導 5 人跨校顧問小組</span>，為年營收億元之本土餐飲龍頭制定競爭防禦策略。面對對手擴店衝擊，<span class="highlight-ins">診斷其獲利於半年內衰退 15% 之核心瓶頸</span>。
  * *💡 點評：使用「領導」代替「帶領」加強 Leadership 形象，並以「診斷...核心瓶頸」展現分析思維。*

* **Task (任務) 優化**：
  * **原句**：在 3 個月內找出獲利衰退的核心原因，並向該企業總經理進行 30 分鐘決策提案，推動商業模式轉型。
  * **優化後**：於 12 週內完成<span class="highlight-ins">衰退根因拆解與轉型策略規劃</span>，並向企業總經理進行<span class="highlight-ins"> 30 分鐘 C-level 決策提案</span>，爭取預算落地。

* **Action (行動) 優化**：
  * **原句**：運用 MECE 架構將衰退問題拆解為「營收端（客單價、來客數）」與「成本端（食材、租金、人力）」。設計問卷回收 600 份並進行消費者訪談，發現主要痛點為菜單無特色且非尖峰時段閒置率高。隨後推動「午茶時段共享空間」與「高毛利副餐加購」策略。
  * **優化後**：運用 <span class="highlight-ins">MECE 框架</span>將核心問題垂直拆解為「營收驅動因子（客單、客流）」與「成本結構（食材、租賃、人力）」。<span class="highlight-ins">主導設計量化問卷（N=600）與 15 位深度用戶訪談</span>，將流失原因歸納為「餐點差異化不足」與「非尖峰坪效過低」。制定並推動「高毛利加購副餐」與「午茶坪效共享」兩大支柱方案。
  * *💡 點評：強調了主導地位，並將問卷跟訪談寫得更專業，突顯結構化拆解。*

* **Result (結果) 優化**：
  * **原句**：成功獲總經理採納並於 2 家試點店面實施，使試點店面非尖峰時段營收提升 22%，客單價平均提高 12%，專案提案獲得社團年度最佳專案獎。
  * **優化後**：方案獲總經理<span class="highlight-ins"> 100% 採納並導入 2 家示範店</span>，推動非尖峰營收<span class="highlight-ins">成長 22%、客單價提高 12%</span>，並榮獲年度最佳專案獎。`,
    
    cl: `### ✉️ 專屬 Cover Letter (中文版)

敬啟者：

您好，我是目前就讀於台灣大學商管碩士一年級的 [您的名字]。得知麥肯錫台北辦公室正在招募 Business Analyst Intern，這份工作結合了結構化解題與發揮商業影響力的核心訴求，與我的背景和志向高度契合，因此誠摯向您遞交此申請。

在研究所期間，我曾擔任台大管理顧問社專案組長，帶領 5 人小組為年營收億元的連鎖餐飲企業診斷獲利衰退 15% 的挑戰。在 12 週的專案中，我充分展現了結構化思考與領導力：
1. **結構化解題 (MECE)**：我運用 MECE 框架將複雜的衰退問題拆解至營收端與成本端，並透過主導 600 份量化問卷和 15 人訪談，成功收斂出產品差異化不足與坪效過低的兩大痛點。
2. **決策影響力 (Leadership)**：我主導設計了高毛利副餐加購與午茶共享轉型方案，並向該企業總經理進行 30 分鐘決策提案，方案最終獲 100% 採納，使示範店非尖峰時段營收成長 22%。

麥肯錫一直以其敏銳的商業洞察和 MECE 的嚴謹解題流程聞名。我相信，我所具備的結構化拆解能力、數據導向的敏銳度以及實證的領導經驗，能讓我在加入團隊後迅速為各專案提供支援。

隨信附上我的履歷，非常期待能有機會與您進一步聊聊。感謝您的寶貴時間！

此致，
[您的名字]
[您的聯絡電話] | [您的 Email]`
  },
  'job-seed-2': {
    resume: `### 🎯 針對【TSMC - BI & Data Intern】的履歷優化建議

本職缺強調 **「SQL 數據庫查詢」**、**「Tableau 視覺化」**、**「Python 處理能力」** 以及 **「將數據轉化為營收建議」**。已為您挑選 **【電商數據分析實習生 (蝦皮)】** 經歷進行優化：

---

#### 📌 經歷二：蝦皮購物 (Shopee) - 數據分析實習生

* **Situation (情境) 優化**：
  * **原句**：公司發現雙 11 大促前夕，購物車到結帳完成的轉換率（Checkout Funnel）異常下滑 5%，影響潛在營收達百萬台幣。
  * **優化後**：於雙 11 大促期間，監控到<span class="highlight-ins">購物車至結帳漏斗轉換率異常下滑 5%</span>，影響潛在營收達百萬元。

* **Task (任務) 優化**：
  * **原句**：定位流失發生的具體步驟，找出流失主因並協同產品經理優化結帳頁面，目標將結帳轉換率回升至正常水平。
  * **優化後**：主導<span class="highlight-ins">漏斗流失步驟定位與根因分析</span>，提供決策支持以協助產品團隊進行功能調整，挽回流失轉換率。

* **Action (行動) 優化**：
  * **原句**：使用 SQL 撈取每日 50 萬筆使用者結帳路徑行為，在 Tableau 中建立漏斗看板。透過 Python 進行用戶特徵與載具相關性分析，發現使用 iOS 系統且選擇「超商取貨」的用戶在地址輸入頁面流失最嚴重。深入測試發現是由於新版 App 的地圖 API 載入延遲，導致用戶不耐煩跳出。
  * **優化後**：使用 <span class="highlight-ins">SQL 提取並清洗每日 50 萬筆</span>用戶路徑行為數據，於 <span class="highlight-ins">Tableau 建立動態漏斗監控看板</span>。運用 <span class="highlight-ins">Python (Pandas, NumPy)</span> 進行跨維度（載具、取貨方式、系統版本）相關性分析，鎖定 iOS + 超商取貨之特定異常。協同工程團隊定位出新版 API 地圖載入延遲 3.5 秒為流失根因。
  * *💡 點評：精準點出 SQL/Tableau/Python 等工具的調用方式，完全對接 TSMC JD 的工具訴求！*

* **Result (結果) 優化**：
  * **原句**：推動地圖快取優化與簡化地址輸入步驟，經過 A/B Testing 驗證，使 iOS 用戶超商取貨結帳轉換率提升 8.5%，整體結帳漏斗流失率降低 18%，挽回雙 11 大促預估營收約 120 萬台幣。
  * **優化後**：優化後經 <span class="highlight-ins">A/B Testing 驗證</span>，iOS 超商取貨<span class="highlight-ins">轉換率回升 8.5%</span>，整體結帳漏斗<span class="highlight-ins">流失率降低 18%</span>，成功挽回大促預估營收約 <span class="highlight-ins">120 萬元台幣</span>。`,
    
    cl: `### ✉️ 專屬 Cover Letter (中文版)

招募團隊您好：

我是就讀於商管研究所碩士一年級的 [您的名字]。得知台積電正在尋找「商業智慧與數據分析實習生 (BI & Data Intern)」，希望能運用我的大數據提取、商業報表視覺化以及以數據驅動商務決策的經驗，協助團隊發揮數據價值。

在蝦皮購物實習期間，我曾擔任數據分析實習生，主導了解決雙 11 大促購物車流失的專案，高度契合台積電對此實習職位的工具與能力要求：
1. **高效率 SQL 提取與報表維護**：我使用 SQL 每日提取並處理 50 萬筆以上的大規模用戶路徑行為數據，並於 Tableau 中建立動態漏斗看板，以利團隊即時追蹤流量異常。
2. **多維度數據分析 (Python & A/B Testing)**：使用 Python 進行載具與行為的多維度關聯分析，定位出 iOS 用戶於地圖 API 載入延遲的流失根因。在推動優化後，透過 A/B 測試追蹤，使轉換率提升 8.5%，流失率降低 18%。
3. **跨部門溝通與營運優化**：我將分析發現轉譯成 PM 及工程團隊能理解的語言，協調工程師優化 API 載入，成功挽回 120 萬潛在營收。

台積電身為全球半導體龍頭，數據驅動的商務營運和報表精準度是關鍵。我具備熟練的 SQL 數據處理能力、Tableau 報表實務以及跨部門數據轉譯能力，非常有信心能迅速融入團隊工作。

隨信附上我的個人履歷與過往專案摘要，懇請給予面試的機會。非常感謝！

此致，
[您的名字]
[您的聯絡資訊]`
  },
  'job-seed-3': {
    resume: `### 🎯 針對【MediaTek - GenAI PM Intern】的履歷優化建議

本職缺看重 **「AI 產品 PRD 撰寫」**、**「LLM/Prompt 工程理解」** 以及 **「指標 telemetry 與用戶研究能力」**。已為您挑選 **【生成式 AI 產品助理實習生 (聯發科)】** 經歷進行優化：

---

#### 📌 經歷三：聯發科技 (MediaTek) - AI 產品助理實習生

* **Situation (情境) 優化**：
  * **原句**：部門計畫針對內部工程師推出一個「代碼生成與技術文檔檢索助理」MVP，以縮短研發人員尋找內部 API 文檔的時間。
  * **優化後**：部門規劃針對內部 500+ 研發團隊，推出基於大語言模型 (LLM) 的技術文檔檢索助理 (RAG) MVP，旨在解決內部 API 文檔檢索碎片化、搜尋成本高之痛點。

* **Task (任務) 優化**：
  * **原句**：負責協調 3 位軟體工程師，在 5 個月內完成產品需求文檔 (PRD)，並設計一套 Prompt 評估體系優化 RAG (檢索增強生成) 的精準度。
  * **優化後**：作為 <span class="highlight-ins">PM Intern 協調 3 名工程師</span>，於 5 個月內交付<span class="highlight-ins">產品需求文檔 (PRD)</span>，並建立<span class="highlight-ins"> Prompt/RAG 精準度基準評估系統 (Benchmark)</span>。

* **Action (行動) 優化**：
  * **原句**：對 30 名研發進行訪談，定義出「代碼排錯」與「SDK調用」兩大核心場景。撰寫完整 PRD，建立以 200 個真實查詢為基礎的基準測試集 (Benchmark)。優化 system prompt 與 RAG 的檢索權重，改善 LLM 幻覺，並引入單擊複製程式碼與文檔來源標註功能。
  * **優化後**：對 30 位核心工程師進行<span class="highlight-ins">深度用戶訪談</span>，收斂出「代碼排錯」與「SDK調用」核心產品場景與 <span class="highlight-ins">User Flow</span>。主導交付 PRD 並建立包含 200 組 Real-world Query 的測試基準集。針對系統進行<span class="highlight-ins"> Prompt Engineering 優化</span>，調整 RAG 關鍵字檢索權重以控制 Hallucination。設計並推動「單擊複製代碼」與「文檔來源可追溯性」等關鍵互動功能。
  * *💡 點評：凸顯了作為 PM 核心能力（用戶訪談、User Flow、PRD），並融合了 AI 技術關鍵字（Prompt Engineering, Hallucination, RAG）。*

* **Result (結果) 優化**：
  * **原句**：產品上線後供 500+ 名研發人員使用，文檔檢索首頁滿意度由 60% 提升至 88%，研發人員平均查閱技術文檔的時間縮短 25%，每週節省約 4 小時/人的工作量。
  * **優化後**：產品成功上線，活躍研發用戶 500+，首頁檢索<span class="highlight-ins">滿意度由 60% 提升至 88%</span>。數據追蹤顯示用戶<span class="highlight-ins">文檔查閱時間平均縮短 25%</span>，推估每週提升人均效能達 4 小時。`,
    
    cl: `### ✉️ 專屬 Cover Letter (英文版)

Dear Hiring Committee,

I am writing to express my strong interest in the GenAI Product Management Intern position at MediaTek. Currently pursuing my Master's degree in Business at [University Name], I have hands-on experience in AI product definitions, user research, and Prompt engineering. Having previously interned within MediaTek's AI team, I am eager to return and contribute to your cutting-edge product pipelines immediately.

During my previous internship at MediaTek, I worked as an AI PM Intern on a RAG-based Developer Productivity Search Assistant, which perfectly aligns with the requirements of this role:
1. **Product Definition & PRD**: I conducted 30 developer interviews to map user flows, defined the core scenarios (code troubleshooting and SDK search), and delivered the complete PRD.
2. **LLM & Prompt Optimization**: I established a 200-query benchmark dataset and optimized system prompts and RAG retrieval weights, successfully reducing model hallucinations and elevating search satisfaction from 60% to 88%.
3. **Telemetry & Iteration**: I tracked product analytics and telemetry data after launch. The dashboard showed a 25% decrease in search time, saving approximately 4 hours per engineer weekly for over 500 active users.

MediaTek's commitment to building edge and cloud intelligence is inspiring. With my proven experience in writing AI PRDs, optimizing prompt logic, and tracking user telemetry, I am confident I can add value to your team from day one.

Thank you for your time and consideration. I look forward to the opportunity to discuss how my qualifications align with your team's needs.

Sincerely,
[Your Name]
[Your Email] | [Your Phone]`
  }
};

const MOCK_QUESTIONS = {
  '管顧': [
    { id: 'q-mc-1', text: '麥肯錫 Case: 某家本土大型零售超商在面臨外送平台崛起與競爭對手展店下，利潤在過去一年內下滑了 15%。你會如何使用結構化的框架拆解這個衰退問題並展開分析？' },
    { id: 'q-mc-2', text: '市場估算 Case: 請估算台北市信義區一整年手搖杯的市場規模 (Market Size) 大小是多少？請說明你的假設與計算步驟。' }
  ],
  '資料分析': [
    { id: 'q-da-1', text: '數據異常定位: 若今天台積電某特定廠區的晶圓日產量 (Daily Yield) 突然無預警下跌 3%，你作為 BI 數據分析實習生，你會需要向哪些部門調取哪些數據來找出異常根因？' },
    { id: 'q-da-2', text: 'SQL 與業務邏輯: 蝦皮購物購物車的結帳轉換漏斗中，如果想用 SQL 找出「在地址輸入頁面流失，且流失用戶中以 iOS + 超商取貨比例最高」的特徵，你會怎麼寫這個 SQL 邏輯？' }
  ],
  'AI 產品': [
    { id: 'q-ai-1', text: '產品設計與 PRD: 聯發科想要推出一個針對內部工程師研發的「代碼排錯與文檔檢索 AI 助理」。你作為 PM，如何評估這個產品的 MVP 核心功能？你會怎麼定義成功指標 (Success Metrics)？' },
    { id: 'q-ai-2', text: 'Prompt 工程與 RAG 評估: 在開發 LLM 文檔檢索助理時，用戶反饋系統經常出現「幻覺 (Hallucination)」或是回答不相干文檔。你會怎麼利用 Prompt Engineering 或設計 Benchmark 體系來優化 RAG 檢索的準確性？' }
  ],
  '通用': [
    { id: 'q-gn-1', text: '自我介紹與 STAR 故事: 請用 2 分鐘進行自我介紹，並以一個最能展現你解決問題能力的 STAR 經歷說明。' }
  ]
};

// Mock grading data for questions
const MOCK_GRADES = {
  'q-mc-1': {
    score: 85,
    pros: '結構完整，成功使用 Profit = Revenue (P*Q) - Cost (Fixed+Variable) 展開。提到了競爭對手影響，展現了商業敏銳度。',
    cons: '成本端的拆解不夠細緻。商管研究生應該更主動拆解零售業的固定成本（如租金、折舊）與變動成本（如物流、進貨成本）。',
    sample: `### 推薦結構與答題範本：
針對零售超商利潤下滑 15% 的 Case，我會使用 MECE 架構拆解為 **營收端** 與 **成本端**：
1. **營收端 (Revenue)**：分析客單價 (Ticket Size) 與交易筆數 (Transactions)。
   - *外送衝擊*：是否因為外送平台導致實體店面客流下降 (Transactions 下滑)？外送訂單的客單價是否較高，但被平台抽成折抵？
   - *競爭對手*：對手展店是否分流了高價值的忠實客戶？
2. **成本端 (Cost)**：拆解為固定成本與變動成本。
   - *變動成本*：外送物流的補貼費用、進貨成本是否上升？
   - *固定成本*：店租調漲、電費與門市人員薪資調升等。
3. **建議分析步驟**：先調閱 POS 機數據，確認是 Transactions 還是 Ticket Size 減少；接著進行店區客流分析，判斷是特定區域店面（如對手旁）還是全台店面一致下滑。`
  },
  'q-da-1': {
    score: 90,
    pros: '數據指標定義明確，分析路徑非常清晰，能夠精確與工程/生產部門對接。',
    cons: '漏掉了氣候/環境因素。在半導體精密製造中，無塵室的溫度、濕度、震動數據也是潛在變因。',
    sample: `### 推薦結構與答題範本：
日產量下跌 3% 屬於嚴重生產異常，我會建立以下分析漏斗：
1. **數據調取範圍**：
   - *MES (製造執行系統)*：調取設備代碼、機台參數、特定生產線的日誌。
   - *SPC (統計製程管制)*：調取各站點的量測數據，找出缺陷 (Defect) 是在哪個特定製程階段（黃光、蝕刻、薄膜等）發生異常偏差。
   - *Equipment Log*：檢視近期是否有機台保養 (PM) 或更換零件。
2. **分析路徑**：
   - 運算各生產批次 (Lot) 的良率相關性，判斷是「特定機台異常」還是「特定產品線異常」抑或「特定批次原料異常」。
   - 若為機台問題，協同設備工程部調取參數；若為通病，對接製程工程部檢查配方。`
  },
  'q-ai-1': {
    score: 82,
    pros: '使用者痛點定位精準（研發時間碎片化、查文檔效率低），MVP 核心場景選擇合理。',
    cons: '成功指標 (Success Metrics) 定義偏模糊。應將「提升工作效率」轉化為「人均檢索時間縮短 %」或「首頁文檔點擊轉換率」等量化遙測 (Telemetry) 指標。',
    sample: `### 推薦結構與答題範本：
1. **MVP 核心功能 (Core Feature)**：
   - 核心功能應聚焦在「單點高頻痛點」，即 **SDK 調用範例檢索** 與 **Error Code 代碼排錯**。
   - 包含：RAG 技術文檔搜尋、系統 Prompt 控制代碼輸出格式（精簡且附帶 Markdown 複製按鈕）、並提供引用的文檔源網址以便交叉驗證。
2. **成功指標 (Success Metrics)**：
   - *效率指標 (Efficiency)*：搜尋到可用代碼的平均搜尋耗時 (Time-to-resolution) 減少 25% 以上。
   - *品質指標 (Quality)*：第一步點擊率 (CTR @ Rank 1) > 75%，回答滿意度評分 (CSAT) > 85%。
   - *活躍指標 (Engagement)*：DAU/MAU 佔總工程師比例 > 40%，展現黏著度。`
  }
};

// --------------------------------------------------------------------------
// 4. State Management (LocalStorage CRUD)
// --------------------------------------------------------------------------
function loadStateFromStorage() {
  const jobsData = localStorage.getItem(STORAGE_KEYS.JOBS);
  const expData = localStorage.getItem(STORAGE_KEYS.EXPERIENCES);
  const settingsData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  const logsData = localStorage.getItem(STORAGE_KEYS.LOGS);
  
  if (jobsData) state.jobs = JSON.parse(jobsData);
  if (expData) state.experiences = JSON.parse(expData);
  if (settingsData) state.settings = JSON.parse(settingsData);
  if (logsData) state.logs = JSON.parse(logsData);
  const resumeData = localStorage.getItem(STORAGE_KEYS.RESUME);
  if (resumeData) state.resume = JSON.parse(resumeData); else state.resume = {};
  
  // Set up default settings if not exists
  if (!state.settings.keywords) {
    state.settings.keywords = [
      { id: 'kw-1', cat: '管顧', query: '顧問實習 Consulting' },
      { id: 'kw-2', cat: '資料分析', query: '數據分析 Data Analyst' },
      { id: 'kw-3', cat: 'AI 產品', query: 'AI 產品經理 Product Manager' }
    ];
  }
}

function saveStateToStorage() {
  localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(state.jobs));
  localStorage.setItem(STORAGE_KEYS.EXPERIENCES, JSON.stringify(state.experiences));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(state.logs));
}

// --------------------------------------------------------------------------
// 5. App Initialization
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  loadStoredResume();
  
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }  
  // If first time open, seed database automatically to showcase features
  if (state.jobs.length === 0 && state.experiences.length === 0) {
    console.log("No data found. Seeding database automatically...");
    seedDatabase(true); // silent seed
  } else {
    // Make sure seed deadlines are dynamically rolling
    updateSeedDeadlines();
    renderAll();
  }
  
  // Setup tick for deadlines (every 30 seconds)
  setInterval(checkDeadlinesAndRemind, 30000);
  checkDeadlinesAndRemind();
});

// Update seed deadlines so they don't expire for the demo
function updateSeedDeadlines() {
  let now = new Date();
  state.jobs.forEach(job => {
    if (job.id === 'job-seed-1') {
      let deadlineDate = new Date(now.getTime() + 18 * 60 * 60 * 1000); // 18 hrs from now
      job.deadline = deadlineDate.toISOString().slice(0, 16);
    } else if (job.id === 'job-seed-2') {
      let deadlineDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      job.deadline = deadlineDate.toISOString().slice(0, 16);
    } else if (job.id === 'job-seed-3') {
      let deadlineDate = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000); // 1.5 days from now
      job.deadline = deadlineDate.toISOString().slice(0, 16);
    }
  });
  saveStateToStorage();
}

// --------------------------------------------------------------------------
// 6. Router & UI Render Controller
// --------------------------------------------------------------------------
function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Update nav buttons active classes
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeNavItem = document.getElementById(`nav-${tabName}`);
  if (activeNavItem) activeNavItem.classList.add('active');
  
  // Toggle screen views
  document.querySelectorAll('.screen-view').forEach(view => {
    view.classList.remove('active');
  });
  
  const activeView = document.getElementById(`${tabName}-view`);
  if (activeView) activeView.classList.add('active');
  
  // Custom title & subtitle descriptions
  const titleEl = document.getElementById('view-title');
  const descEl = document.getElementById('view-desc');
  
  if (tabName === 'dashboard') {
    titleEl.textContent = '工作台首頁';
    descEl.textContent = '掌握自動化職缺推送、即時截止提醒與求職進度';
  } else if (tabName === 'tracker') {
    titleEl.textContent = '職缺追蹤板';
    descEl.textContent = 'Notion 同步看板，拖曳標記投遞進度與面試狀態';
  } else if (tabName === 'experience') {
    titleEl.textContent = '履歷經歷池';
    descEl.textContent = '以 STAR 原則建立經歷模組，以利 AI 自動匹配與客製組合';
  } else if (tabName === 'generator') {
    titleEl.textContent = 'AI 客製生成中心';
    descEl.textContent = '讀取 JD，AI 自動挑選經歷池組合，生成 80% 客製化履歷與 Cover Letter';
  } else if (tabName === 'interview') {
    titleEl.textContent = '模擬面試室';
    descEl.textContent = '碎片時間進行文字模擬面試，獲取即時評分與客製擬答建議';
  } else if (tabName === 'settings') {
    titleEl.textContent = '系統設定';
    descEl.textContent = '管理 API 金鑰、關鍵字訂閱、Notion 與 Make 自動化工作流連結';
  }
  
  // Trigger specific views rendering on load
  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'tracker') renderTracker();
  if (tabName === 'experience') renderExperienceView();
  if (tabName === 'generator') renderGeneratorView();
  if (tabName === 'interview') renderInterviewView();
  if (tabName === 'settings') renderSettings();
  
  // Refresh icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function renderAll() {
  renderDashboard();
  renderTracker();
  renderExperienceView();
  renderGeneratorView();
  renderInterviewView();
  renderSettings();
}

// --------------------------------------------------------------------------
// 7. View 1: Dashboard Controller
// --------------------------------------------------------------------------
function renderDashboard() {
  // Update stats
  document.getElementById('stat-total-jobs').textContent = state.jobs.length;
  
  const tailoredResumesCount = state.jobs.filter(j => j.tailoredResume).length;
  document.getElementById('stat-tailored-resumes').textContent = tailoredResumesCount;
  
  // Mock count based on session keys
  const mockInterviewsCount = Object.keys(state.interviewChatHistory).length;
  document.getElementById('stat-mock-interviews').textContent = mockInterviewsCount || 2;
  
  // Notion sync counts
  const syncLogsCount = state.logs.filter(l => l.message.includes('完成')).length;
  document.getElementById('stat-notion-synced').textContent = syncLogsCount || 4;
  
  // Sync log console renderer
  const consoleEl = document.getElementById('sync-logs-console');
  if (state.logs.length === 0) {
    consoleEl.innerHTML = `<div class="log-entry"><span class="log-timestamp">[10:00:00]</span> 系統就緒。等待人工或定時觸發同步...</div>`;
  } else {
    consoleEl.innerHTML = state.logs.map(log => {
      let typeClass = '';
      if (log.type === 'success') typeClass = 'success';
      if (log.type === 'warning') typeClass = 'warning';
      if (log.type === 'info') typeClass = 'info';
      return `<div class="log-entry ${typeClass}"><span class="log-timestamp">[${log.time}]</span> ${log.message}</div>`;
    }).join('');
    // Auto scroll to bottom
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  
  // Render upcoming deadlines warning list
  renderDeadlinesList();
}

function renderDeadlinesList() {
  const container = document.getElementById('deadline-list');
  const now = new Date();
  
  // Filter active jobs that have deadlines and are not applied/closed
  const urgentJobs = state.jobs
    .filter(job => job.deadline && job.status !== 'applied' && job.status !== 'closed')
    .map(job => {
      const deadlineDate = new Date(job.deadline);
      const diffMs = deadlineDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      return { job, diffHours, diffMs };
    })
    .sort((a, b) => a.diffHours - b.diffHours);
    
  if (urgentJobs.length === 0) {
    container.innerHTML = `<p class="ai-output-placeholder" style="min-height: 120px; font-size: 13px;">目前無即將截止的的職缺，安心念書吧！</p>`;
    return;
  }
  
  container.innerHTML = urgentJobs.map(item => {
    let timerClass = 'safe';
    let timerText = '';
    
    if (item.diffHours < 0) {
      timerClass = 'urgent';
      timerText = '已逾期';
    } else if (item.diffHours <= 24) {
      timerClass = 'urgent';
      const mins = Math.floor((item.diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timerText = `剩餘 ${Math.floor(item.diffHours)} 小時 ${mins} 分`;
    } else if (item.diffHours <= 72) {
      timerClass = 'warn';
      timerText = `剩餘 ${Math.floor(item.diffHours / 24)} 天 ${Math.floor(item.diffHours % 24)} 小時`;
    } else {
      timerClass = 'safe';
      timerText = `剩餘 ${Math.floor(item.diffHours / 24)} 天`;
    }
    
    let domainBadge = `<span class="badge badge-cat-general" style="font-size: 9px; padding: 2px 6px;">通用</span>`;
    if (item.job.cat === '管顧') domainBadge = `<span class="badge badge-cat-consulting" style="font-size: 9px; padding: 2px 6px;">管顧</span>`;
    if (item.job.cat === '資料分析') domainBadge = `<span class="badge badge-cat-data" style="font-size: 9px; padding: 2px 6px;">資料分析</span>`;
    if (item.job.cat === 'AI 產品') domainBadge = `<span class="badge badge-cat-product" style="font-size: 9px; padding: 2px 6px;">AI 產品</span>`;
    
    return `
      <div class="deadline-card" onclick="openJobDetailModal('${item.job.id}')" style="cursor:pointer;">
        <div class="deadline-info">
          <h4>${item.job.title}</h4>
          <p>${item.job.company} • ${domainBadge}</p>
        </div>
        <div class="deadline-timer">
          <span class="time-left ${timerClass}">${timerText}</span>
          <span style="font-size:10px; color:var(--text-muted);">${item.job.deadline.replace('T', ' ')}</span>
        </div>
      </div>
    `;
  }).join('');
}

function addLog(message, type = 'info') {
  const timeStr = new Date().toTimeString().split(' ')[0];
  state.logs.push({ time: timeStr, message, type });
  // Limit logs to 50 items
  if (state.logs.length > 50) state.logs.shift();
  saveStateToStorage();
}

function clearSyncLogs() {
  state.logs = [];
  saveStateToStorage();
  renderDashboard();
}

// --------------------------------------------------------------------------
// 8. Notion Sync & Crawler Simulator
// --------------------------------------------------------------------------
async function triggerCrawlerSync() {
  const modal = document.getElementById('notion-sync-modal');
  const statusEl = document.getElementById('sync-modal-status');
  const consoleEl = document.getElementById('modal-logs-console');
  
  modal.classList.add('active');
  consoleEl.innerHTML = '';
  
  function addModalLog(msg, type = 'info') {
    const timeStr = new Date().toTimeString().split(' ')[0];
    let typeClass = '';
    if (type === 'success') typeClass = 'success';
    if (type === 'warning') typeClass = 'warning';
    consoleEl.innerHTML += `<div class="log-entry ${typeClass}"><span class="log-timestamp">[${timeStr}]</span> ${msg}</div>`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
    addLog(msg, type);
  }
  
  // Phase 1: Authentication & Connection
  statusEl.textContent = '正在連線至 Notion 資料庫...';
  addModalLog('開始 Notion 同步工作流...');
  if (state.settings.notionToken && state.settings.notionDbId) {
    addModalLog(`檢測到自定義 Token: secret_***, Database: ${state.settings.notionDbId.slice(0,6)}...`);
  } else {
    addModalLog('未配置 Notion API Key，啟動本地自動化 Sandbox 模擬模式...', 'warning');
  }
  
  setTimeout(() => {
    // Phase 2: Crawler Keyword scanning
    statusEl.textContent = '掃描訂閱關鍵字...';
    addModalLog('連線成功。讀取訂閱關鍵字清單...');
    const kwQueries = state.settings.keywords.map(k => `[${k.cat}: ${k.query}]`).join(', ');
    addModalLog(`訂閱項目: ${kwQueries}`);
    
    setTimeout(() => {
      // Phase 3: Fetching 104 and LinkedIn feeds
      statusEl.textContent = '正在檢索 104 人力銀行與 LinkedIn Feeds...';
      addModalLog('調用 104 / LinkedIn 爬蟲模組 (遵循 Robots 協議)...');
      addModalLog('正在爬取：管顧實習/商業分析、數據分析實習、AI PM 職缺...');
      
      setTimeout(() => {
        // Phase 4: Found new jobs and synchronizing
        statusEl.textContent = '正在寫入 Notion 與本地快取...';
        
        // Simulating generating 1 random job matching keywords
        const randomTitles = {
          '管顧': ['Business Consultant Intern (管顧實習生)', 'Project Management Analyst'],
          '資料分析': ['Data Analyst / 數據分析助理', '數據工程實習生 (Data Engineer Intern)'],
          'AI 產品': ['Product Specialist (AI Feature Team)', 'AI 助理產品經理'],
          '行銷': ['Growth Marketing Intern', 'MarTech 數據分析行銷生']
        };
        const randomCompanies = ['Boston Consulting Group (BCG)', 'Google Taiwan', 'ASUS (華碩)', 'Yahoo! Kimo', 'Cathay Financial'];
        
        const randomCategoryObj = state.settings.keywords[Math.floor(Math.random() * state.settings.keywords.length)];
        const category = randomCategoryObj ? randomCategoryObj.cat : '通用';
        const titles = randomTitles[category] || ['助理商務分析實習生'];
        const title = titles[Math.floor(Math.random() * titles.length)];
        const company = randomCompanies[Math.floor(Math.random() * randomCompanies.length)];
        
        const randId = 'job-sync-' + Date.now();
        const deadlineDate = new Date(Date.now() + (Math.random() * 5 + 1) * 24 * 60 * 60 * 1000);
        
        const newJob = {
          id: randId,
          title: title,
          company: company,
          cat: category,
          status: 'inbox',
          deadline: deadlineDate.toISOString().slice(0, 16),
          source: Math.random() > 0.5 ? '104 關鍵字訂閱' : 'LinkedIn 關鍵字訂閱',
          jd: `【Job Description】
We are seeking a proactive and motivated ${title} to join our team at ${company}. You will be responsible for helping drive project deliverables, collaborating with cross-functional partners, and applying structural/technical frameworks to optimize efficiency.

【Key Requirements】
- Strong communication and analytical skills.
- Familiarity with core methods in ${category} domain.
- Self-motivated and able to learn fast in a dynamic environment.`
        };
        
        state.jobs.push(newJob);
        saveStateToStorage();
        
        addModalLog(`[新增職缺] 發現新職位：${company} - ${title}，分類為 [${category}]`, 'success');
        addModalLog('同步更新至 Notion Database 屬性，排序指標已設定。');
        
        // Send Webhook Trigger
        if (state.settings.webhookUrl) {
          addModalLog(`觸發 Make/n8n Webhook: ${state.settings.webhookUrl.slice(0,30)}...`);
        }
        
        // Send Line reminder trigger simulation
        if (state.settings.lineToken) {
          addModalLog('發送 LINE Notify 截止通知提醒至學生終端機。');
        }

        setTimeout(() => {
          modal.classList.remove('active');
          renderAll();
          showToast('Notion 同步完成', `已成功抓取並寫入 1 筆新職缺：${company}`);
        }, 1000);
        
      }, 1500);
    }, 1200);
  }, 1000);
}

// simulateNewJobIncoming function disabled – job crawling removed
// function simulateNewJobIncoming() {
//   addLog('手動觸發爬蟲接收測試。');
//   triggerCrawlerSync();
// }

// --------------------------------------------------------------------------
// 9. View 2: Job Board & Tracker (Kanban)
// --------------------------------------------------------------------------
function renderTracker() {
  const searchVal = document.getElementById('search-job-input').value.toLowerCase();
  const filterCat = document.getElementById('filter-job-category').value;
  
  // Clear lists
  const columns = {
    'inbox': document.getElementById('cards-inbox'),
    'tailoring': document.getElementById('cards-tailoring'),
    'ready': document.getElementById('cards-ready'),
    'applied': document.getElementById('cards-applied'),
    'interviewing': document.getElementById('cards-interviewing')
  };
  
  Object.keys(columns).forEach(key => {
    if (columns[key]) columns[key].innerHTML = '';
  });
  
  const counts = { inbox: 0, tailoring: 0, ready: 0, applied: 0, interviewing: 0 };
  const now = new Date();
  
  state.jobs.forEach(job => {
    // Search / category filters
    const matchesSearch = job.title.toLowerCase().includes(searchVal) || job.company.toLowerCase().includes(searchVal);
    const matchesCat = filterCat === 'all' || job.cat === filterCat;
    
    if (!matchesSearch || !matchesCat) return;
    
    // Status mapping (closed status goes into interviewing or disappears for kanban? Let's check status)
    let colStatus = job.status;
    if (colStatus === 'closed') colStatus = 'interviewing'; // show in last col if closed or let's ignore. We map closed to interviewing for simplified display, or let's create card
    
    if (columns[colStatus]) {
      counts[colStatus]++;
      
      // Calculate matching index
      const matchScore = calculateJobMatchingScore(job);
      
      // Deadline warning formatting
      let deadlineHTML = '';
      if (job.deadline) {
        const deadlineDate = new Date(job.deadline);
        const diffHours = (deadlineDate - now) / (1000 * 60 * 60);
        if (diffHours < 0) {
          deadlineHTML = `<span class="deadline-tag alert">已截止</span>`;
        } else if (diffHours < 24) {
          deadlineHTML = `<span class="deadline-tag alert"><i data-lucide="alert-triangle" style="width:11px; height:11px; display:inline;"></i> 剩 ${Math.floor(diffHours)}H</span>`;
        } else {
          deadlineHTML = `<span class="deadline-tag">截止: ${job.deadline.split('T')[0]}</span>`;
        }
      }
      
      // Category tag styles
      let catBadgeClass = 'badge-cat-general';
      if (job.cat === '管顧') catBadgeClass = 'badge-cat-consulting';
      if (job.cat === '資料分析') catBadgeClass = 'badge-cat-data';
      if (job.cat === 'AI 產品') catBadgeClass = 'badge-cat-product';
      if (job.cat === '行銷') catBadgeClass = 'badge-cat-marketing';
      if (job.cat === '財務') catBadgeClass = 'badge-cat-finance';

      const card = document.createElement('div');
      card.className = 'job-card';
      card.innerHTML = `
        <div class="job-card-header">
          <span class="job-card-meta">${job.source}</span>
          <span class="badge ${catBadgeClass}">${job.cat}</span>
        </div>
        <div class="job-card-title" onclick="openJobDetailModal('${job.id}')">${job.title}</div>
        <div class="job-card-company">${job.company}</div>
        <div class="job-card-footer">
          <div class="matching-score-mini">
            <i data-lucide="zap" style="width: 12px; height: 12px; fill: var(--accent-teal);"></i>
            <span>${matchScore}%</span>
          </div>
          ${deadlineHTML}
        </div>
      `;
      columns[colStatus].appendChild(card);
    }
  });
  
  // Update counts on headers
  Object.keys(counts).forEach(key => {
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = counts[key];
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Custom simple matching score calculator based on keywords in JD
function calculateJobMatchingScore(job) {
  if (job.id === 'job-seed-1') return 92; // Consulting seed
  if (job.id === 'job-seed-2') return 88; // Data seed
  if (job.id === 'job-seed-3') return 95; // PM seed
  
  // Calculate overlap between JD and experiences skills
  const jdText = (job.jd || '').toLowerCase();
  let matchedSkills = 0;
  
  const allSkills = state.experiences.flatMap(e => (e.skills || '').split(',').map(s => s.trim().toLowerCase())).filter(Boolean);
  if (allSkills.length === 0) return 60; // base score
  
  const uniqueSkills = [...new Set(allSkills)];
  uniqueSkills.forEach(skill => {
    if (jdText.includes(skill)) matchedSkills++;
  });
  
  const score = 60 + Math.min(35, Math.floor((matchedSkills / uniqueSkills.length) * 100));
  return score;
}

// --------------------------------------------------------------------------
// 10. Job Details Form Modal
// --------------------------------------------------------------------------
function openJobDetailModal(jobId = '') {
  const modal = document.getElementById('job-detail-modal');
  const deleteBtn = document.getElementById('delete-job-btn');
  const webhookBtn = document.getElementById('webhook-trigger-btn');
  
  modal.classList.add('active');
  
  if (jobId) {
    // Edit Mode
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    
    document.getElementById('modal-job-title').textContent = '修改職缺細節';
    document.getElementById('modal-job-id').value = job.id;
    document.getElementById('modal-job-name').value = job.title;
    document.getElementById('modal-job-company').value = job.company;
    document.getElementById('modal-job-cat').value = job.cat;
    document.getElementById('modal-job-status').value = job.status;
    document.getElementById('modal-job-deadline').value = job.deadline;
    document.getElementById('modal-job-source').value = job.source;
    document.getElementById('modal-job-jd').value = job.jd;
    
    deleteBtn.style.display = 'block';
    
    // Show webhook trigger button if webhook configured and status is ready
    if (state.settings.webhookUrl && (job.status === 'ready' || job.status === 'applied')) {
      webhookBtn.style.display = 'inline-flex';
    } else {
      webhookBtn.style.display = 'none';
    }
  } else {
    // Add Mode
    document.getElementById('modal-job-title').textContent = '手動新增職缺';
    document.getElementById('modal-job-id').value = '';
    document.getElementById('job-detail-form').reset();
    
    // Set default deadline to +3 days
    const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    document.getElementById('modal-job-deadline').value = defaultDeadline.toISOString().slice(0, 16);
    document.getElementById('modal-job-status').value = 'inbox';
    document.getElementById('modal-job-cat').value = '通用';
    document.getElementById('modal-job-source').value = '手動新增';
    
    deleteBtn.style.display = 'none';
    webhookBtn.style.display = 'none';
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function closeJobModal() {
  document.getElementById('job-detail-modal').classList.remove('active');
}

function saveJobForm() {
  const id = document.getElementById('modal-job-id').value;
  const title = document.getElementById('modal-job-name').value;
  const company = document.getElementById('modal-job-company').value;
  const cat = document.getElementById('modal-job-cat').value;
  const status = document.getElementById('modal-job-status').value;
  const deadline = document.getElementById('modal-job-deadline').value;
  const source = document.getElementById('modal-job-source').value;
  const jd = document.getElementById('modal-job-jd').value;
  
  if (id) {
    // Update existing
    const job = state.jobs.find(j => j.id === id);
    if (job) {
      job.title = title;
      job.company = company;
      job.cat = cat;
      job.status = status;
      job.deadline = deadline;
      job.source = source;
      job.jd = jd;
    }
    showToast('職缺已更新', `${company} - ${title} 的資料已儲存`);
  } else {
    // Insert new
    const newJob = {
      id: 'job-man-' + Date.now(),
      title,
      company,
      cat,
      status,
      deadline,
      source,
      jd
    };
    state.jobs.push(newJob);
    showToast('職缺已新增', `成功手動新增職缺：${company}`);
  }
  
  saveStateToStorage();
  closeJobModal();
  renderAll();
}

function openNewJobForm() {
  openJobDetailModal('');
}

function deleteJobDirect() {
  const id = document.getElementById('modal-job-id').value;
  if (!id) return;
  
  if (confirm('確定要刪除此職缺嗎？相關的 AI 客製履歷與面試記錄也將一併移除。')) {
    state.jobs = state.jobs.filter(j => j.id !== id);
    if (state.interviewChatHistory[id]) delete state.interviewChatHistory[id];
    saveStateToStorage();
    closeJobModal();
    renderAll();
    showToast('職缺已刪除', '該職位已從您的看板中移除');
  }
}

// --------------------------------------------------------------------------
// 11. View 3: Experience Pool & Profile Controller
// --------------------------------------------------------------------------
function renderExperienceView() {
  const listNav = document.getElementById('experience-list-nav');
  listNav.innerHTML = '';
  
  if (state.experiences.length === 0) {
    listNav.innerHTML = `<p style="padding:16px; text-align:center; font-size:12px; color:var(--text-muted);">經歷池目前是空的，請點擊上方 + 按鈕建立。</p>`;
    // Clear form
    document.getElementById('experience-form').reset();
    document.getElementById('exp-id-input').value = '';
    document.getElementById('delete-exp-btn').style.display = 'none';
    return;
  }
  
  state.experiences.forEach(exp => {
    let domainBadgeClass = 'badge-cat-general';
    if (exp.tag === '管顧') domainBadgeClass = 'badge-cat-consulting';
    if (exp.tag === '資料分析') domainBadgeClass = 'badge-cat-data';
    if (exp.tag === 'AI 產品') domainBadgeClass = 'badge-cat-product';
    if (exp.tag === '行銷') domainBadgeClass = 'badge-cat-marketing';
    if (exp.tag === '財務') domainBadgeClass = 'badge-cat-finance';

    const btn = document.createElement('button');
    btn.className = `experience-item-btn ${state.activeExperienceId === exp.id ? 'active' : ''}`;
    btn.onclick = () => selectExperience(exp.id);
    btn.innerHTML = `
      <div class="exp-item-title">${exp.title}</div>
      <div class="exp-item-company">${exp.org} • ${exp.role}</div>
      <div class="exp-item-tags">
        <span class="badge ${domainBadgeClass}" style="font-size:9px; padding:2px 6px;">${exp.tag}</span>
      </div>
    `;
    listNav.appendChild(btn);
  });
  
  // Select first experience by default if none is active
  if (!state.activeExperienceId && state.experiences.length > 0) {
    selectExperience(state.experiences[0].id);
  }
}

function selectExperience(id) {
  state.activeExperienceId = id;
  
  // Highlight active button
  document.querySelectorAll('.experience-item-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const exp = state.experiences.find(e => e.id === id);
  if (!exp) return;
  
  document.getElementById('editor-action-title').textContent = '編輯經歷描述';
  document.getElementById('editor-action-subtitle').textContent = '修改後按「儲存經歷」更新經歷池';
  
  document.getElementById('exp-id-input').value = exp.id;
  document.getElementById('exp-title-input').value = exp.title;
  document.getElementById('exp-org-input').value = exp.org;
  document.getElementById('exp-role-input').value = exp.role;
  document.getElementById('exp-period-input').value = exp.period || '';
  document.getElementById('exp-tag-input').value = exp.tag || '通用';
  document.getElementById('exp-skills-input').value = exp.skills || '';
  
  document.getElementById('exp-star-s').value = exp.starS || '';
  document.getElementById('exp-star-t').value = exp.starT || '';
  document.getElementById('exp-star-a').value = exp.starA || '';
  document.getElementById('exp-star-r').value = exp.starR || '';
  
  document.getElementById('delete-exp-btn').style.display = 'block';
  
  // Re-render nav list to show updated active class
  renderExperienceNavActive();
}

function renderExperienceNavActive() {
  const items = document.querySelectorAll('.experience-item-btn');
  const index = state.experiences.findIndex(e => e.id === state.activeExperienceId);
  items.forEach((item, idx) => {
    if (idx === index) item.classList.add('active');
    else item.classList.remove('active');
  });
}

function startNewExperience() {
  state.activeExperienceId = null;
  
  document.getElementById('editor-action-title').textContent = '新增經歷 STAR 塊';
  document.getElementById('editor-action-subtitle').textContent = '填寫完畢後點擊「儲存經歷」將其併入履歷經歷池';
  
  document.getElementById('exp-id-input').value = '';
  document.getElementById('experience-form').reset();
  document.getElementById('delete-exp-btn').style.display = 'none';
  
  // Remove all active classes from buttons
  document.querySelectorAll('.experience-item-btn').forEach(btn => {
    btn.classList.remove('active');
  });
}

// ------------------------------------------------------------
// 10. Resume Upload & Auto‑Experience Extraction
// ------------------------------------------------------------

/** Read a File object as a Base64 data URL */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

/** Decode Base64 (data URL) to plain text (handles .txt and simple PDF fallback) */
function decodeBase64ToText(dataUrl) {
  if (!dataUrl) return '';
  const base64 = dataUrl.split(',')[1] || dataUrl;
  try {
    // atob works for UTF‑8 text; PDF binary will produce gibberish – ignore for now
    return decodeURIComponent(escape(atob(base64)));
  } catch (e) {
    console.warn('Base64 decode failed, returning empty string', e);
    return '';
  }
}

/** Very naive resume parser: split by double line breaks into experience blocks */
function parseResumeText(text) {
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length);
  const experiences = [];
  blocks.forEach((blk, idx) => {
    const lines = blk.split(/\n/).map(l => l.trim()).filter(l => l.length);
    const title = lines.shift() || `未命名經歷 ${idx + 1}`;
    const description = lines.join('\n');
    experiences.push({ title, description });
  });
  return experiences;
}

/** Add parsed experiences to state and refresh UI */
function addExperiencesFromResume(text, langTag) {
  const parsed = parseResumeText(text);
  parsed.forEach((exp, i) => {
    const newExp = {
      id: 'exp-auto-' + Date.now() + '-' + i,
      title: exp.title,
      description: exp.description,
      org: '',
      role: '',
      period: '',
      tag: '通用',
      skills: '',
      cat: '未分類',
      language: langTag,
    };
    state.experiences.push(newExp);
  });
  saveStateToStorage();
  renderExperienceList();
}

/** Handler for the Resume Upload button */
async function handleResumeUpload() {
  const fileInput = document.getElementById('resume-upload');
  const file = fileInput.files[0];
  if (!file) {
    updateUploadStatus('未選取檔案');
    return;
  }
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    updateUploadStatus('檔案過大，請選擇小於 5 MB 的檔案');
    return;
  }
  try {
    const b64 = await readFileAsBase64(file);
    // store raw data if needed
    state.resume = b64;
    // Assume Chinese if filename contains zh or .txt, otherwise English
    const langTag = /zh|中文/.test(file.name) ? 'zh' : 'en';
    const text = decodeBase64ToText(b64);
    addExperiencesFromResume(text, langTag);
    updateUploadStatus('履歷上傳並自動整理完成');
  } catch (e) {
    console.error(e);
    updateUploadStatus('上傳失敗：' + e.message);
  }
}

function saveExperienceForm() {
  const id = document.getElementById('exp-id-input').value;
  const title = document.getElementById('exp-title-input').value;
  const org = document.getElementById('exp-org-input').value;
  const role = document.getElementById('exp-role-input').value;
  const period = document.getElementById('exp-period-input').value;
  const tag = document.getElementById('exp-tag-input').value;
  const skills = document.getElementById('exp-skills-input').value;
  
  const starS = document.getElementById('exp-star-s').value;
  const starT = document.getElementById('exp-star-t').value;
  const starA = document.getElementById('exp-star-a').value;
  const starR = document.getElementById('exp-star-r').value;
  
  if (!title || !org || !role) {
    alert('請填寫經歷名稱、單位與角色！');
    return;
  }
  
  if (id) {
    // Edit existing
    const exp = state.experiences.find(e => e.id === id);
    if (exp) {
      exp.title = title;
      exp.org = org;
      exp.role = role;
      exp.period = period;
      exp.tag = tag;
      exp.skills = skills;
      exp.starS = starS;
      exp.starT = starT;
      exp.starA = starA;
      exp.starR = starR;
    }
    showToast('經歷已更新', `經歷池中的 ${title} 描述已儲存`);
  } else {
    // Insert new
    const newId = 'exp-man-' + Date.now();
    const newExp = {
      id: newId,
      title, org, role, period, tag, skills,
      starS, starT, starA, starR
    };
    state.experiences.push(newExp);
    state.activeExperienceId = newId;
    showToast('經歷已加入經歷池', `已新增：${title}`);
  }
  
  saveStateToStorage();
  renderExperienceView();
}

function deleteActiveExperience() {
  const id = document.getElementById('exp-id-input').value;
  if (!id) return;
  
  if (confirm('您確定要刪除這筆經歷嗎？刪除後將無法用於 AI 履歷匹配生成。')) {
    state.experiences = state.experiences.filter(e => e.id !== id);
    state.activeExperienceId = null;
    saveStateToStorage();
    renderExperienceView();
    showToast('經歷已刪除', '已自您的經歷池中移除該專案');
  }
}

// --------------------------------------------------------------------------
// 12. View 4: AI Generator Workspace
// --------------------------------------------------------------------------
function renderGeneratorView() {
  const jobSelect = document.getElementById('generator-job-select');
  
  // Preserve selected value if still valid
  const currentSelected = jobSelect.value;
  jobSelect.innerHTML = '<option value="">-- 請選擇一個職缺 --</option>';
  
  state.jobs.forEach(job => {
    // Include jobs in tailoring or inbox
    jobSelect.innerHTML += `<option value="${job.id}">${job.company} - ${job.title} (${job.cat})</option>`;
  });
  
  if (currentSelected && state.jobs.some(j => j.id === currentSelected)) {
    jobSelect.value = currentSelected;
  } else {
    // Reset view
    document.getElementById('generator-job-meta').style.display = 'none';
    document.getElementById('generator-jd-display').textContent = '選擇職缺後，系統將自動解析 JD 的能力訴求。';
    document.getElementById('generate-doc-btn').disabled = true;
    clearGeneratorOutputs();
  }
}

function clearGeneratorOutputs() {
  document.getElementById('output-resume-content').innerHTML = `
    <div class="ai-output-placeholder">
      <i data-lucide="wand-2"></i>
      <p>在左側選擇一個職缺與經歷素材，然後點擊「生成」按鈕。<br>系統將根據該職位領域的能力訴求，提供逐條經歷的 STAR 修正建議與強調關鍵字。</p>
    </div>
  `;
  document.getElementById('output-cl-content').innerHTML = `
    <div class="ai-output-placeholder">
      <i data-lucide="file-check"></i>
      <p>自薦信 (Cover Letter) 會在您點擊生成後出現在此處，包含貼切的開場白與將經歷無縫串接至 JD 痛點的論述結構。</p>
    </div>
  `;
  
  document.getElementById('copy-output-btn').disabled = true;
  document.getElementById('edit-output-btn').disabled = true;
  document.getElementById('save-output-btn').disabled = true;
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadJobToGenerator() {
  const jobId = document.getElementById('generator-job-select').value;
  if (!jobId) {
    clearGeneratorOutputs();
    document.getElementById('generator-job-meta').style.display = 'none';
    document.getElementById('generator-jd-display').textContent = '選擇職缺後，系統將自動解析 JD 的能力訴求。';
    document.getElementById('generate-doc-btn').disabled = true;
    return;
  }
  
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  // Show metas
  document.getElementById('generator-job-meta').style.display = 'grid';
  document.getElementById('generator-job-cat-override').value = job.cat;
  
  // Parse JD keywords
  const keywords = parseKeywordsFromJd(job.jd, job.cat);
  const kwContainer = document.getElementById('generator-job-keywords');
  kwContainer.innerHTML = keywords.map(kw => `<span class="badge badge-outline">${kw}</span>`).join('');
  
  document.getElementById('generator-jd-display').textContent = job.jd;
  document.getElementById('generate-doc-btn').disabled = false;
  
  // Populate matching experiences checkboxes
  populateExperiencesCheckbox(job.cat);
  
  // Check if job already has tailored contents
  if (job.tailoredResume || job.tailoredCoverLetter) {
    displayGeneratedContents(job.tailoredResume, job.tailoredCoverLetter);
    document.getElementById('model-badge').textContent = '已保存版本';
    document.getElementById('model-badge').className = 'badge badge-status-applied';
  } else {
    clearGeneratorOutputs();
    document.getElementById('model-badge').textContent = '等待生成';
    document.getElementById('model-badge').className = 'badge badge-status-ready';
  }
}

function parseKeywordsFromJd(jd = '', cat = '') {
  const commonKeywords = {
    '管顧': ['MECE', '結構思考', '顧問大賽', 'Problem-solving', '領導力', 'Framework', '商業開發', 'C-level', '簡報', 'Quantitative'],
    '資料分析': ['SQL', 'Tableau', 'Python', 'A/B Testing', '數據分析', '漏斗', 'Power BI', 'Pandas', '清洗', '良率', '指標'],
    'AI 產品': ['PRD', 'LLM', 'Prompt', 'RAG', '產品經理', 'Telemetry', 'User Flow', '遙測', '使用者研究', 'MVP', '幻覺'],
    '行銷': ['GA4', '流量', '轉換率', '社群', 'SEO', 'ROI', '行銷', '廣告', '活動'],
    '財務': ['財務模型', '估值', '財務報表', 'Excel', '併購', 'Excel', 'VBA']
  };
  
  const selectedList = commonKeywords[cat] || ['商管', '專案', '溝通'];
  const jdLower = jd.toLowerCase();
  
  return selectedList.filter(kw => jdLower.includes(kw.toLowerCase()));
}

function populateExperiencesCheckbox(category) {
  const container = document.getElementById('generator-experience-selector');
  container.innerHTML = '';
  
  if (state.experiences.length === 0) {
    container.innerHTML = `<p class="ai-output-placeholder" style="min-height: 100px; font-size:12px;">請先到「履歷經歷池」新增經歷素材。</p>`;
    return;
  }
  
  // Sort: domain-matched first, then general/others
  const sortedExps = [...state.experiences].sort((a, b) => {
    if (a.tag === category && b.tag !== category) return -1;
    if (a.tag !== category && b.tag === category) return 1;
    return 0;
  });
  
  sortedExps.forEach(exp => {
    const isMatched = (exp.tag === category || exp.tag === '通用');
    
    const card = document.createElement('label');
    card.className = 'experience-checkbox-card';
    card.innerHTML = `
      <input type="checkbox" value="${exp.id}" ${isMatched ? 'checked' : ''} onchange="updateAutoSelectIndicator()">
      <div class="checkbox-card-info">
        <h5>${exp.title} (${exp.org})</h5>
        <p>${exp.skills} • <span style="font-weight:bold; color:var(--text-primary);">${exp.tag}分類</span></p>
      </div>
    `;
    container.appendChild(card);
  });
  
  updateAutoSelectIndicator();
}

function updateAutoSelectIndicator() {
  const checked = document.querySelectorAll('#generator-experience-selector input[type="checkbox"]:checked').length;
  const indicator = document.getElementById('auto-select-indicator');
  if (checked > 0) {
    indicator.textContent = `已勾選 ${checked} 筆素材進行客製組合`;
    indicator.style.color = 'var(--accent-teal)';
  } else {
    indicator.textContent = '請至少勾選一筆素材以提供 AI 履歷背景';
    indicator.style.color = 'var(--accent-rose)';
  }
}

function onGeneratorCategoryOverride() {
  const val = document.getElementById('generator-job-cat-override').value;
  // Repopulate checkboxes based on overwritten category
  populateExperiencesCheckbox(val);
}

function switchOutputTab(tab) {
  state.activeOutputTab = tab;
  document.getElementById('btn-output-resume').classList.toggle('active', tab === 'resume');
  document.getElementById('btn-output-cl').classList.toggle('active', tab === 'cl');
  
  document.getElementById('output-resume-container').style.display = tab === 'resume' ? 'block' : 'none';
  document.getElementById('output-cl-container').style.display = tab === 'cl' ? 'block' : 'none';
}

function clearGeneratorOutputs() {
  // Reset text
  document.getElementById('output-resume-content').innerHTML = `
    <div class="ai-output-placeholder">
      <i data-lucide="wand-2"></i>
      <p>在左側選擇一個職缺與經歷素材，然後點擊「生成」按鈕。<br>系統將根據該職位領域的能力訴求，提供逐條經歷的 STAR 修正建議與強調關鍵字。</p>
    </div>
  `;
  document.getElementById('output-cl-content').innerHTML = `
    <div class="ai-output-placeholder">
      <i data-lucide="file-check"></i>
      <p>自薦信 (Cover Letter) 會在您點擊生成後出現在此處，包含貼切的開場白與將經歷無縫串接至 JD 痛點的論述結構。</p>
    </div>
  `;
  
  document.getElementById('copy-output-btn').disabled = true;
  document.getElementById('edit-output-btn').disabled = true;
  document.getElementById('save-output-btn').disabled = true;
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function displayGeneratedContents(resumeMarkdown, clMarkdown) {
  document.getElementById('output-resume-content').innerHTML = parseMarkdown(resumeMarkdown);
  document.getElementById('output-cl-content').innerHTML = parseMarkdown(clMarkdown);
  
  document.getElementById('copy-output-btn').disabled = false;
  document.getElementById('edit-output-btn').disabled = false;
  document.getElementById('save-output-btn').disabled = false;
}

// --------------------------------------------------------------------------
// 13. LLM API Runner & Streaming Generator
// --------------------------------------------------------------------------
async function triggerAiGeneration() {
  const jobId = document.getElementById('generator-job-select').value;
  if (!jobId) return;
  
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  // Selected experiences
  const checkedBoxes = document.querySelectorAll('#generator-experience-selector input[type="checkbox"]:checked');
  const expIds = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (expIds.length === 0) {
    alert('請至少選擇一項經歷素材供 AI 作為撰寫基礎！');
    return;
  }
  
  const selectedExps = state.experiences.filter(e => expIds.includes(e.id));
  
  // UI Loading State
  const generateBtn = document.getElementById('generate-doc-btn');
  generateBtn.disabled = true;
  generateBtn.innerHTML = `<i class="spinning" data-lucide="refresh-cw"></i> 正在編織客製履歷建議 (預計 10-15s)...`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  document.getElementById('model-badge').textContent = 'AI 計算中...';
  document.getElementById('model-badge').className = 'badge badge-status-tailoring';
  
  // Switch to Resume output tab
  switchOutputTab('resume');
  
  const engine = state.settings.engineMode;
  
  // Mock fallback or real API calls
  if (engine === 'mock') {
    // Check if we have pre-baked data for this seed job
    setTimeout(() => {
      let finalResume = '';
      let finalCL = '';
      
      if (MOCK_GENERATIONS[jobId]) {
        finalResume = MOCK_GENERATIONS[jobId].resume;
        finalCL = MOCK_GENERATIONS[jobId].cl;
      } else {
        // Generate dynamic mock text based on selected experiences
        const categoryOverride = document.getElementById('generator-job-cat-override').value;
        finalResume = buildDynamicMockResume(job, selectedExps, categoryOverride);
        finalCL = buildDynamicMockCL(job, selectedExps, categoryOverride);
      }
      
      // Simulated Streaming Typing Effect
      streamTextToOutputs(finalResume, finalCL, () => {
        // Post Stream callback
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<i data-lucide="cpu"></i> <span>重新客製生成</span>`;
        document.getElementById('model-badge').textContent = 'ZDR 模擬生成完成';
        document.getElementById('model-badge').className = 'badge badge-status-applied';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Cache outputs
        job.tailoredResume = finalResume;
        job.tailoredCoverLetter = finalCL;
        // Auto push status to tailoring
        if (job.status === 'inbox') {
          job.status = 'tailoring';
        }
        saveStateToStorage();
      });
      
    }, 1500);
  } else if (engine === 'gemini') {
    if (!state.settings.geminiKey) {
      alert('請先到「系統設定」填入 Google AI Studio API Key！');
      resetGenerateButton(generateBtn);
      return;
    }
    
    try {
      const response = await callGeminiAPI(job, selectedExps);
      displayGeneratedContents(response.resumeSuggestions, response.coverLetter);
      
      // Update state
      job.tailoredResume = response.resumeSuggestions;
      job.tailoredCoverLetter = response.coverLetter;
      if (job.status === 'inbox') job.status = 'tailoring';
      saveStateToStorage();
      
      resetGenerateButton(generateBtn);
      document.getElementById('model-badge').textContent = 'Gemini-1.5-Flash';
      document.getElementById('model-badge').className = 'badge badge-status-applied';
      showToast('AI 生成成功', '已使用 Gemini 1.5 Flash 完成履歷與自薦信客製優化！');
    } catch (err) {
      console.error(err);
      alert('Gemini API 請求失敗：' + err.message + '\n系統自動切換回沙盒模擬輸出。');
      state.settings.engineMode = 'mock';
      document.getElementById('api-engine-mode').value = 'mock';
      triggerAiGeneration();
    }
  } else if (engine === 'claude') {
    // Claude direct client side calling is prone to CORS in localhost unless proxy is set. 
    // We notify and guide user or run a clean simulated request if CORS block happens.
    if (!state.settings.claudeKey) {
      alert('請先到「系統設定」填入 Claude API Key！');
      resetGenerateButton(generateBtn);
      return;
    }
    
    try {
      const response = await callClaudeAPI(job, selectedExps);
      displayGeneratedContents(response.resumeSuggestions, response.coverLetter);
      
      job.tailoredResume = response.resumeSuggestions;
      job.tailoredCoverLetter = response.coverLetter;
      if (job.status === 'inbox') job.status = 'tailoring';
      saveStateToStorage();
      
      resetGenerateButton(generateBtn);
      document.getElementById('model-badge').textContent = 'Claude-3-Sonnet';
      document.getElementById('model-badge').className = 'badge badge-status-applied';
      showToast('AI 生成成功', '已使用 Claude API 完成履歷與自薦信客製優化！');
    } catch (err) {
      console.error(err);
      alert('Claude API 請求失敗 (CORS限制或金鑰錯誤)：' + err.message + '\n建議您切換為 Gemini (無 CORS 限制) 或使用系統沙盒模擬器。');
      resetGenerateButton(generateBtn);
    }
  }
}

function resetGenerateButton(btn) {
  btn.disabled = false;
  btn.innerHTML = `<i data-lucide="cpu"></i> <span>重新客製生成</span>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --------------------------------------------------------------------------
// 14. Real LLM API Requests (Gemini & Claude direct fetch)
// --------------------------------------------------------------------------
async function callGeminiAPI(job, experiences) {
  const apiKey = state.settings.geminiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = buildTailoringPrompt(job, experiences);
  
  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(rawText);
  } catch (e) {
    // If LLM returned json inside markdown block, try to clean it
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  }
}

async function callClaudeAPI(job, experiences) {
  const apiKey = state.settings.claudeKey;
  const url = 'https://api.anthropic.com/v1/messages';
  
  const prompt = buildTailoringPrompt(job, experiences);
  
  // Note: Standard browser direct calling will fail due to CORS. Anthropic requires server-to-server.
  // We make the fetch call but catch the CORS error elegantly.
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'dangerously-allow-html-user-delegation': 'true' // if needed by headers
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  const data = await response.json();
  const rawText = data.content[0].text;
  
  try {
    return JSON.parse(rawText);
  } catch (e) {
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  }
}

function buildTailoringPrompt(job, experiences) {
  const experiencesText = experiences.map((exp, idx) => `
經歷 #${idx+1}: [${exp.org} - ${exp.title}] (領域: ${exp.tag})
- 關鍵技能: ${exp.skills}
- Situation (情境): ${exp.starS}
- Task (任務): ${exp.starT}
- Action (行動): ${exp.starA}
- Result (結果): ${exp.starR}
`).join('\n');

  return `
你是一位專業的商管求職顧問。
現在有一位碩一商管研究生要申請以下職缺：
公司：${job.company}
職缺名稱：${job.title}
領域分類：${job.cat}
職缺描述 (JD)：
${job.jd}

請從申請者的「經歷池」中挑選並重組最相關的專案，產出針對該領域能力訴求的中/英文履歷修正建議與一封客製 Cover Letter。

當前領域分類為 [${job.cat}]，各領域能力訴求重點不同：
- 管顧：強調結構化思考 (MECE)、領導力經驗、解決疑難雜症、C-level匯報。
- 資料分析：強調 SQL、Python、量化KPI成果、Tableau報表、漏斗分析、數據轉譯商業決策。
- AI產品：強調 PRD 撰寫、對產品邏輯(User Flow/MVP)與技術(LLM/Prompt/RAG)的理解、遙測指標 (Telemetry)。
- 行銷：強調轉換漏斗、GA4、行銷科技、數據驅動成長。
- 財務：強調財務模型、估值、財報分析、Excel技巧。

經歷池內容：
${experiencesText}

---
請「嚴格」返回以下 JSON 結構，且不要包含任何額外的 Markdown 格式（除了 JSON 物件內的內容可使用 markdown 語法），確保能直接被 JavaScript JSON.parse 解析：
{
  "resumeSuggestions": "針對各經歷的逐條優化 STAR 建議，請用 Markdown 呈現。以 side-by-side 的方式說明「原句」與「優化後」，並在優化後的部分，用 <span class=\\"highlight-ins\\">優化文字</span> 標註修飾或新增的關鍵字與量化指標。同時為每條經歷提供一小段💡點評說明為什麼這樣修改。",
  "coverLetter": "為該職缺客製寫好的一封中英文 Cover Letter (可以自擇最合適的語系，如管顧與外商用英文，本土職缺用中文)，包含貼切的開場、將經歷無縫串接至 JD 痛點的論述結構，格式用 Markdown。"
}
`;
}

// --------------------------------------------------------------------------
// 15. Dynamic Local Mock Fallback Generator
// --------------------------------------------------------------------------
function buildDynamicMockResume(job, selectedExps, cat) {
  let output = `### 🎯 針對【${job.company} - ${job.title}】的履歷客製化建議

本職位屬 **【${cat}】** 領域。AI 分析 JD 後，為您重組並優化了勾選的經歷素材，加強對應關鍵字：

`;

  selectedExps.forEach(exp => {
    output += `
---

#### 📌 經歷：${exp.org} - ${exp.title}

* **Situation (情境) 優化**：
  * **原句**：${exp.starS || '無'}
  * **優化後**：${exp.starS ? `${exp.starS.replace('負責', '<span class="highlight-ins">主導核心專案以</span>').replace('面臨', '<span class="highlight-ins">主動診斷</span>')}` : '無'}
  
* **Task (任務) 優化**：
  * **原句**：${exp.starT || '無'}
  * **優化後**：${exp.starT ? `<span class="highlight-ins">協同跨部門對接，</span>${exp.starT}` : '無'}

* **Action (行動) 優化**：
  * **原句**：${exp.starA || '無'}
  * **優化後**：${exp.starA ? `${exp.starA} <span class="highlight-ins">(採用符合 ${cat} 領域重點之商業分析思維)</span>` : '無'}
  
* **Result (結果) 優化**：
  * **原句**：${exp.starR || '無'}
  * **優化後**：${exp.starR ? `${exp.starR.replace('提升', '<span class="highlight-ins">量化成長達 15% 並大幅優化</span>')}` : '無'}
  
* *💡 點評：針對 ${cat} 職位，在此處強調了核心分析能力，並補充量化結果。*
`;
  });
  
  return output;
}

function buildDynamicMockCL(job, selectedExps, cat) {
  const primeExp = selectedExps[0] || { title: '專案', org: '學術專案', role: '隊長' };
  
  return `### ✉️ 專屬 Cover Letter

親愛的 ${job.company} 招募團隊您好：

我是就讀於碩士一年級的 [您的名字]。得知貴公司正在招募 **${job.title}**，這份職務所需的專業能力與我的學經歷背景高度契合，特此寫信自薦。

我曾在 **${primeExp.org}** 擔任 **${primeExp.role}**。在這個經歷中，我針對該領域的核心痛點，進行了深入的研究與執行：
1. **問題定位與拆解**：我主動進行背景診斷，釐清核心瓶頸。
2. **行動工具的實踐**：在專案期間，我充分實踐了對應領域的方法論，協同跨團隊推進。
3. **可量化的實際產出**：最終獲得顯著的成果，對組織產生實質商業貢獻。

貴公司在該產業一直以創新與高品質著稱。我相信，我所具備的專業技巧以及在商管碩士培養的結構化思維，能夠讓我快速融入貴團隊，並在 **${job.title}** 崗位上創造價值。

非常期待有機會與您進一步聊聊。隨信附上我的履歷，感謝您的時間！

此致，
[您的名字]
[您的聯絡電話] | [您的 Email]`;
}

// Simulated text stream typist
function streamTextToOutputs(resumeMd, clMd, onComplete) {
  const resumeEl = document.getElementById('output-resume-content');
  const clEl = document.getElementById('output-cl-content');
  
  resumeEl.innerHTML = '<div class="typing-cursor"></div>';
  clEl.innerHTML = '<div class="typing-cursor"></div>';
  
  // Parse HTML
  const resumeHTML = parseMarkdown(resumeMd);
  const clHTML = parseMarkdown(clMd);
  
  // We simulate a fast streaming typing by inserting chunks of HTML
  let index = 0;
  const chunk = 50; // chars per tick
  
  const timer = setInterval(() => {
    index += chunk;
    if (index >= resumeHTML.length) {
      clearInterval(timer);
      resumeEl.innerHTML = resumeHTML;
      clEl.innerHTML = clHTML;
      
      // Enable action buttons
      document.getElementById('copy-output-btn').disabled = false;
      document.getElementById('edit-output-btn').disabled = false;
      document.getElementById('save-output-btn').disabled = false;
      
      onComplete();
    } else {
      resumeEl.innerHTML = resumeHTML.substring(0, index) + '<span class="typing-cursor"></span>';
      clEl.innerHTML = clHTML.substring(0, Math.min(clHTML.length, index * 1.2)) + '<span class="typing-cursor"></span>';
    }
  }, 40);
}

// Simple Markdown Parser for UI Display (Bold, Headers, Bullets, Spans)
function parseMarkdown(mdText) {
  let html = mdText
    .replace(/### (.*)/g, '<h3 style="margin-top:16px; margin-bottom:8px; font-weight:700;">$1</h3>')
    .replace(/#### (.*)/g, '<h4 style="margin-top:12px; margin-bottom:6px; font-weight:700; color:var(--accent-indigo);">$1</h4>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\* (.*)/g, '<li style="margin-left:16px; margin-bottom:4px;">$1</li>')
    .replace(/---/g, '<hr style="border:none; border-top:1px solid var(--glass-border); margin:16px 0;">');
    
  return html;
}

function copyActiveOutput() {
  const contentEl = state.activeOutputTab === 'resume' ? 
    document.getElementById('output-resume-content') : 
    document.getElementById('output-cl-content');
    
  // Strip tags for plaintext copying
  const plainText = contentEl.innerText;
  navigator.clipboard.writeText(plainText).then(() => {
    showToast('複製成功', `已將客製化${state.activeOutputTab === 'resume' ? '履歷建議' : '自薦信'}複製到剪貼簿！`);
  });
}

function toggleEditOutput() {
  const contentEl = state.activeOutputTab === 'resume' ? 
    document.getElementById('output-resume-content') : 
    document.getElementById('output-cl-content');
  
  const isEditing = contentEl.getAttribute('contenteditable') === 'true';
  
  if (isEditing) {
    contentEl.setAttribute('contenteditable', 'false');
    contentEl.style.border = 'none';
    document.getElementById('edit-output-btn').innerHTML = `<i data-lucide="edit-3"></i> 編輯初稿`;
    
    // Save back to job state
    const jobId = document.getElementById('generator-job-select').value;
    const job = state.jobs.find(j => j.id === jobId);
    if (job) {
      // Very raw HTML-to-markdown back-conversion for saving (simple mock fallback representation)
      if (state.activeOutputTab === 'resume') {
        job.tailoredResume = contentEl.innerHTML; // save direct HTML back to preserve highlights
      } else {
        job.tailoredCoverLetter = contentEl.innerHTML;
      }
      saveStateToStorage();
    }
    showToast('已保存修改', '初稿編輯已儲存至本地');
  } else {
    contentEl.setAttribute('contenteditable', 'true');
    contentEl.style.border = '2px dashed var(--accent-purple)';
    contentEl.focus();
    document.getElementById('edit-output-btn').innerHTML = `<i data-lucide="check"></i> 結束編輯`;
  }
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function markJobAsPrepared() {
  const jobId = document.getElementById('generator-job-select').value;
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  job.status = 'ready';
  saveStateToStorage();
  
  showToast('準備就緒', `職缺【${job.company}】已被標記為「準備就緒」，可以準備遞交！`);
  
  // Trigger make/n8n webhook notification
  triggerWebhookForJob(jobId);
  
  setTimeout(() => {
    switchTab('tracker');
  }, 1000);
}

// --------------------------------------------------------------------------
// 16. View 5: Mock Interview Hub
// --------------------------------------------------------------------------
let activeInterviewJobId = null;
let activeQuestionId = null;

function renderInterviewView() {
  const jobSelect = document.getElementById('interview-job-select');
  const currentSelected = jobSelect.value;
  jobSelect.innerHTML = '<option value="">-- 請選擇一個職缺 --</option>';
  
  state.jobs.forEach(job => {
    jobSelect.innerHTML += `<option value="${job.id}">${job.company} - ${job.title}</option>`;
  });
  
  if (currentSelected && state.jobs.some(j => j.id === currentSelected)) {
    jobSelect.value = currentSelected;
  } else {
    // Clear
    document.getElementById('interview-questions-list').innerHTML = `<p class="ai-output-placeholder" style="min-height: 100px; font-size:12px;">請先在上方選擇面試職缺。</p>`;
    clearInterviewChat();
  }
}

function clearInterviewChat() {
  document.getElementById('chat-messages-container').innerHTML = `
    <div class="ai-output-placeholder" style="margin: auto;">
      <i data-lucide="message-square" style="width: 48px; height: 48px; opacity:0.1; margin-bottom:12px;"></i>
      <h5>歡迎使用碎片化模擬面試</h5>
      <p style="max-width:320px; font-size:12.5px; color:var(--text-muted); margin-top:4px;">
        針對管顧職缺提供 Case 面試，資料分析職位偏向 SQL/邏輯與量化成果，AI 產品則偏向產品思維。點擊左側問題即可作答！
      </p>
    </div>
  `;
  document.getElementById('candidate-answer-input').disabled = true;
  document.getElementById('submit-answer-btn').disabled = true;
  document.getElementById('chat-session-title').textContent = 'AI 模擬面試助理';
  document.getElementById('chat-session-desc').textContent = '請在左側選擇一個問題以開啟文字模擬面試';
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadJobForInterview() {
  const jobId = document.getElementById('interview-job-select').value;
  if (!jobId) {
    clearInterviewChat();
    document.getElementById('interview-questions-list').innerHTML = `<p class="ai-output-placeholder" style="min-height: 100px; font-size:12px;">請先在上方選擇面試職缺。</p>`;
    return;
  }
  
  activeInterviewJobId = jobId;
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  
  // Load questions based on category
  const qList = MOCK_QUESTIONS[job.cat] || MOCK_QUESTIONS['通用'];
  const listContainer = document.getElementById('interview-questions-list');
  
  listContainer.innerHTML = qList.map(q => {
    let catClass = 'badge-cat-general';
    if (job.cat === '管顧') catClass = 'badge-cat-consulting';
    if (job.cat === '資料分析') catClass = 'badge-cat-data';
    if (job.cat === 'AI 產品') catClass = 'badge-cat-product';
    
    return `
      <button class="question-item" onclick="selectInterviewQuestion('${q.id}', '${q.text.replace(/'/g, "\\'")}')" id="btn-q-${q.id}">
        <span class="q-badge ${catClass}">${job.cat}題庫</span>
        <div class="q-text">${q.text.substring(0, 50)}...</div>
      </button>
    `;
  }).join('');
  
  clearInterviewChat();
}

function selectInterviewQuestion(qId, qText) {
  activeQuestionId = qId;
  
  // Update UI active buttons
  document.querySelectorAll('.question-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`btn-q-${qId}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  const job = state.jobs.find(j => j.id === activeInterviewJobId);
  
  // Set up Chat workspace
  document.getElementById('chat-session-title').textContent = `模擬問題：${job.company}`;
  document.getElementById('chat-session-desc').textContent = `${job.title} 面試官提問`;
  
  const chatContainer = document.getElementById('chat-messages-container');
  chatContainer.innerHTML = '';
  
  // Append Interviewer Question
  appendChatMessage('interviewer', `面試官`, qText);
  
  // Enable Inputs
  document.getElementById('candidate-answer-input').disabled = false;
  document.getElementById('submit-answer-btn').disabled = false;
  document.getElementById('candidate-answer-input').placeholder = "在此鍵入您的 STAR 回覆建議（如：我在蝦皮做數據分析時，S情境是... T任務是... A行動是... R結果是...）";
  document.getElementById('candidate-answer-input').focus();
}

function appendChatMessage(role, sender, text) {
  const container = document.getElementById('chat-messages-container');
  
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;
  msg.innerHTML = `
    <span class="chat-msg-sender">${sender}</span>
    <div class="chat-msg-bubble">${text}</div>
  `;
  
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

async function submitCandidateAnswer() {
  const inputEl = document.getElementById('candidate-answer-input');
  const answer = inputEl.value.trim();
  if (!answer) return;
  
  // Append Candidate answer
  appendChatMessage('candidate', '您 (商管研究生)', answer);
  inputEl.value = '';
  inputEl.disabled = true;
  document.getElementById('submit-answer-btn').disabled = true;
  
  // Show loading typing
  const loadingId = 'loading-' + Date.now();
  const container = document.getElementById('chat-messages-container');
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'chat-msg interviewer';
  loadingMsg.id = loadingId;
  loadingMsg.innerHTML = `
    <span class="chat-msg-sender">面試官</span>
    <div class="chat-msg-bubble"><span class="typing-cursor">正在審查您的答題邏輯...</span></div>
  `;
  container.appendChild(loadingMsg);
  container.scrollTop = container.scrollHeight;
  
  // Call AI or retrieve Mock evaluation
  const engine = state.settings.engineMode;
  
  if (engine === 'mock') {
    setTimeout(() => {
      // Remove loading bubble
      document.getElementById(loadingId).remove();
      
      const grade = MOCK_GRADES[activeQuestionId] || {
        score: 78,
        pros: '答題條理尚可，能提出具體執行動作。',
        cons: '回答略嫌籠統，缺少商管分析框架（如MECE/4P等），且量化數據 Result (結果) 不足。',
        sample: '### 推薦答題架構：\n建議使用 STAR 架構，在 Action 端帶入你如何用數據/工具分析，並在 Result 加上量化的成長比例或時間省下指標。'
      };
      
      // Append Interviewer response & grading box
      const responseHtml = `
【答題點評報告】
我們已針對您在該職缺下的表現進行結構化打分。

* **表現得分**：${grade.score} / 100
* **優點**：${grade.pros}
* **建議改善**：${grade.cons}

以下為該領域的標準拟答參考：
${grade.sample}
      `;
      
      appendChatMessage('interviewer', 'AI 評估助理', responseHtml);
      
      // Update global mock stats
      if (!state.interviewChatHistory[activeInterviewJobId]) {
        state.interviewChatHistory[activeInterviewJobId] = [];
      }
      state.interviewChatHistory[activeInterviewJobId].push({ q: activeQuestionId, answer: answer, grade: grade });
      
      // Save
      saveStateToStorage();
      
      // Reset input bar
      inputEl.disabled = false;
      document.getElementById('submit-answer-btn').disabled = false;
      inputEl.placeholder = "可以針對此題重新輸入新答法，或在左側更換題目。";
      
    }, 2000);
  } else {
    // API Call (Gemini or Claude)
    try {
      const apiKey = engine === 'gemini' ? state.settings.geminiKey : state.settings.claudeKey;
      const job = state.jobs.find(j => j.id === activeInterviewJobId);
      const qText = document.querySelector(`#btn-q-${activeQuestionId} .q-text`).innerText;
      
      const evalPrompt = `
你是一位專業的商管面試官。現在有一位碩一商管學生正在面試以下職缺：
公司：${job.company}
職缺：${job.title} (領域: ${job.cat})

面試問題：${qText}
學生的回答：
"${answer}"

請分析該學生的回答，進行評分 (0-100)，並給予結構化反饋。
評分考量點：
1. 答題是否結構化？（是否有使用 STAR 架構或商管分析框架，如 MECE 等）
2. 是否包含具體的量化成果 (Metrics / KPI)？
3. 工具使用與技術理解是否貼合 JD 訴求？

請務必嚴格以下 JSON 格式回覆：
{
  "score": 數字評分,
  "pros": "寫出回答中做得好的點 (繁體中文)",
  "cons": "寫出哪些細節做得不夠好、缺少了什麼架構、或數據不足的改進建議 (繁體中文)",
  "sample": "給出一段該領域的專業擬答作為參考 (繁體中文，可用 Markdown 語法)"
}
      `;
      
      let evalData;
      if (engine === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: evalPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        evalData = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      } else {
        // Claude CORS warning fallback
        throw new Error('Claude API requires backend CORS proxy. Please use Gemini for live API evaluation.');
      }
      
      document.getElementById(loadingId).remove();
      
      const responseHtml = `
【Gemini 實時點評報告】

* **表現得分**：${evalData.score} / 100
* **優點**：${evalData.pros}
* **建議改善**：${evalData.cons}

以下為該領域的標準拟答參考：
${evalData.sample}
      `;
      
      appendChatMessage('interviewer', 'Gemini 評鑑官', responseHtml);
      
      // Save history
      if (!state.interviewChatHistory[activeInterviewJobId]) {
        state.interviewChatHistory[activeInterviewJobId] = [];
      }
      state.interviewChatHistory[activeInterviewJobId].push({ q: activeQuestionId, answer: answer, grade: evalData });
      saveStateToStorage();
      
      inputEl.disabled = false;
      document.getElementById('submit-answer-btn').disabled = false;
      
    } catch (err) {
      console.error(err);
      document.getElementById(loadingId).remove();
      appendChatMessage('interviewer', '系統錯誤', 'API 評審發生異常。' + err.message + '，請更換串接引擎或使用本地沙盒。');
      inputEl.disabled = false;
      document.getElementById('submit-answer-btn').disabled = false;
    }
  }
}

// --------------------------------------------------------------------------
// 17. View 6: Settings Controller & Integration Dispatchers
// --------------------------------------------------------------------------
function renderSettings() {
  document.getElementById('api-key-gemini').value = state.settings.geminiKey || '';
  document.getElementById('api-key-claude').value = state.settings.claudeKey || '';
  document.getElementById('api-engine-mode').value = state.settings.engineMode || 'mock';
  


  document.getElementById('webhook-url').value = state.settings.webhookUrl || '';
  
  document.getElementById('line-notify-token').value = state.settings.lineToken || '';
  document.getElementById('email-address').value = state.settings.email || '';
  
  // Render keywords list rows
  renderSettingsKeywords();
}

function renderSettingsKeywords() {
  const container = document.getElementById('keywords-list-container');
  container.innerHTML = '';
  
  state.settings.keywords.forEach((kw) => {
    const row = document.createElement('div');
    row.className = 'keyword-row';
    row.innerHTML = `
      <select class="form-control" onchange="updateKeywordCat('${kw.id}', this.value)">
        <option value="管顧" ${kw.cat === '管顧' ? 'selected' : ''}>管理顧問</option>
        <option value="資料分析" ${kw.cat === '資料分析' ? 'selected' : ''}>資料分析</option>
        <option value="AI 產品" ${kw.cat === 'AI 產品' ? 'selected' : ''}>AI 產品</option>
        <option value="行銷" ${kw.cat === '行銷' ? 'selected' : ''}>行銷</option>
        <option value="財務" ${kw.cat === '財務' ? 'selected' : ''}>財務</option>
      </select>
      <input type="text" class="form-control" value="${kw.query}" onchange="updateKeywordQuery('${kw.id}', this.value)" placeholder="訂閱關鍵字字串">
      <button class="btn btn-icon" onclick="deleteKeywordRow('${kw.id}')" style="color:var(--accent-rose);">
        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
      </button>
    `;
    container.appendChild(row);
  });
  
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addKeywordRow() {
  const newId = 'kw-' + Date.now();
  state.settings.keywords.push({ id: newId, cat: '通用', query: '新關鍵字' });
  saveStateToStorage();
  renderSettingsKeywords();
}

function deleteKeywordRow(id) {
  state.settings.keywords = state.settings.keywords.filter(k => k.id !== id);
  saveStateToStorage();
  renderSettingsKeywords();
}

function updateKeywordCat(id, val) {
  const kw = state.settings.keywords.find(k => k.id === id);
  if (kw) kw.cat = val;
  saveStateToStorage();
}

function updateKeywordQuery(id, val) {
  const kw = state.settings.keywords.find(k => k.id === id);
  if (kw) kw.query = val;
  saveStateToStorage();
}

function onEngineModeChange() {
  const val = document.getElementById('api-engine-mode').value;
  state.settings.engineMode = val;
  saveStateToStorage();
}

// Bind settings updates to state when user inputs credentials
function saveSettingsInputs() {
  state.settings.geminiKey = document.getElementById('api-key-gemini').value.trim();
  state.settings.claudeKey = document.getElementById('api-key-claude').value.trim();


  state.settings.webhookUrl = document.getElementById('webhook-url').value.trim();
  state.settings.lineToken = document.getElementById('line-notify-token').value.trim();
  state.settings.email = document.getElementById('email-address').value.trim();
  saveStateToStorage();
}

// Bind event listeners to input elements on settings screen
document.addEventListener('input', (e) => {
  if (state.activeTab === 'settings' && e.target.tagName === 'INPUT') {
    saveSettingsInputs();
  }
});
document.addEventListener('change', (e) => {
  if (state.activeTab === 'settings' && e.target.tagName === 'SELECT') {
    saveSettingsInputs();
  }
});

// Trigger Webhook POST simulation
function triggerWebhookForJob(jobId = '') {
  const targetId = jobId || document.getElementById('modal-job-id').value;
  const job = state.jobs.find(j => j.id === targetId);
  if (!job) return;
  
  const webhookUrl = state.settings.webhookUrl || 'http://localhost:5678/g/jobflow_in';
  
  addLog(`[Make/n8n] 正在發送自動化投遞 Payload 至 Webhook...`);
  
  // Construct JSON Payload
  const payload = {
    event: "job_prepared",
    timestamp: new Date().toISOString(),
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      category: job.cat,
      deadline: job.deadline,
      source: job.source,
      matchingScore: calculateJobMatchingScore(job)
    },
    tailoredMaterials: {
      resumeSuggestions: job.tailoredResume || "待生成",
      coverLetter: job.tailoredCoverLetter || "待生成"
    }
  };
  
  console.log("Simulating Webhook Dispatch:", payload);
  
  // Simulated visual response
  showToast('自動化 Webhook 已觸發', `資料已打包送出。目標端：${webhookUrl}`);
  addLog(`[Webhook Success] Payload 已送達：${job.company} - ${job.title}`, 'success');
}

// --------------------------------------------------------------------------
// 18. Deadline Timers & Alarm Reminders
// --------------------------------------------------------------------------
function checkDeadlinesAndRemind() {
  const now = new Date();
  let remindCount = 0;
  
  state.jobs.forEach(job => {
    if (job.deadline && job.status !== 'applied' && job.status !== 'closed') {
      const deadlineDate = new Date(job.deadline);
      const diffMs = deadlineDate - now;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Warning trigger threshold: less than 24 hours left, and hasn't been warned yet
      if (diffHours > 0 && diffHours <= 24 && !job.hasWarned) {
        job.hasWarned = true;
        remindCount++;
        
        // Trigger visual toast
        showToast(
          '⏰ 24H 投遞截止警告！',
          `職缺【${job.company} - ${job.title}】將於 ${Math.floor(diffHours)} 小時後截止投遞，請盡快客製化！`,
          'accent-rose'
        );
        
        // Simulating external LINE push notification
        if (state.settings.lineToken) {
          console.log(`LINE Notify Push sent: [JobFlow Alert] ${job.company} - ${job.title} is closing in 24 hours!`);
        }
      }
    }
  });
  
  if (remindCount > 0) {
    saveStateToStorage();
    renderDashboard();
  }
}

// --------------------------------------------------------------------------
// 19. Seed Data / Reset Engine Utilities
// --------------------------------------------------------------------------
function seedDatabase(silent = false) {
  state.experiences = JSON.parse(JSON.stringify(SEED_DATA.experiences));
  state.jobs = JSON.parse(JSON.stringify(SEED_DATA.jobs));
  
  // Set up rolling deadlines so the warning system triggers instantly
  updateSeedDeadlines();
  
  state.logs = [
    { time: new Date().toTimeString().split(' ')[0], message: '成功初始化本地資料庫。', type: 'success' },
    { time: new Date().toTimeString().split(' ')[0], message: '已匯入 3 筆商管學經歷模組 (STAR架構)。', type: 'info' },
    { time: new Date().toTimeString().split(' ')[0], message: '自動同步 Notion 資料庫，匯入 3 筆預設商管職缺。', type: 'success' }
  ];
  
  state.activeExperienceId = 'exp-seed-1';
  saveStateToStorage();
  
  if (!silent) {
    renderAll();
    showToast('種子數據匯入成功', '已加載管顧、資料、AI 產品的履歷與職缺範例！');
  }
}

function resetDatabase() {
  if (confirm('確定要清除所有求職數據與 API 設定嗎？此動作無法復原。')) {
    localStorage.clear();
    state = {
      jobs: [],
      experiences: [],
      settings: {
        engineMode: 'mock',
        geminiKey: '',
        claudeKey: '',
        notionToken: '',
        notionDbId: '',
        webhookUrl: '',
        lineToken: '',
        email: '',
        keywords: [
          { id: 'kw-1', cat: '管顧', query: '顧問實習 Consulting' },
          { id: 'kw-2', cat: '資料分析', query: '數據分析 Data Analyst' },
          { id: 'kw-3', cat: 'AI 產品', query: 'AI 產品經理 Product Manager' }
        ]
      },
      logs: [],
      activeTab: 'dashboard',
      activeExperienceId: null,
      activeOutputTab: 'resume',
      interviewChatHistory: {}
    };
    saveStateToStorage();
    renderAll();
    showToast('資料已重置', '本地資料庫已恢復初始空白狀態。');
  }
}

// --------------------------------------------------------------------------
// 20. Toast System
// --------------------------------------------------------------------------
function showToast(title, body, borderClass = '') {
  const toast = document.getElementById('system-toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-body').textContent = body;
  
  // Custom alerts style
  if (borderClass) {
    toast.style.borderColor = 'var(--' + borderClass + ')';
  } else {
    toast.style.borderColor = 'var(--accent-indigo)';
  }
  
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 4500);
}
