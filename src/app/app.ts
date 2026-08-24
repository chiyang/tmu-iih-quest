import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';

type View = 'intro' | 'map' | 'quest' | 'career';
type BranchId = 'medical' | 'programming' | 'data' | 'ai' | 'product' | 'communication';
type RegionKind = 'start' | 'main' | 'specialization' | 'career';
type QuestPhase = 'dialogue' | 'choice' | 'result';

interface SkillBranch {
  readonly id: BranchId;
  readonly name: string;
  readonly shortName: string;
  readonly image: string;
  readonly accent: string;
  readonly description: string;
}

interface SkillItem {
  readonly id: string;
  readonly name: string;
  readonly branch: BranchId;
  readonly tier: number;
  readonly description: string;
  readonly canDo: string;
}

interface Capability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requires: readonly string[];
}

interface QuestOption {
  readonly archetype: string;
  readonly icon: string;
  readonly label: string;
  readonly detail: string;
  readonly consequence: string;
  readonly rewards: readonly string[];
}

interface WorldRegion {
  readonly id: string;
  readonly chapter: string;
  readonly name: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly kind: RegionKind;
  readonly x: number;
  readonly y: number;
  readonly requiresRegions: readonly string[];
  readonly scene: string;
  readonly speaker: string;
  readonly briefing: string;
  readonly question: string;
  readonly options: readonly QuestOption[];
}

interface CareerProfile {
  readonly regionId: string;
  readonly kicker: string;
  readonly className: string;
  readonly realWorldTitle: string;
  readonly description: string;
  readonly formula: readonly string[];
  readonly careers: readonly string[];
  readonly research: readonly string[];
  readonly nextSkills: readonly string[];
}

interface RoundSnapshot {
  readonly regionId: string;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: Readonly<Record<string, number>>;
  readonly selectedTrack: string | null;
}

interface SavedState {
  readonly view: View;
  readonly acquiredSkills: readonly string[];
  readonly completedRegions: readonly string[];
  readonly choices: Readonly<Record<string, number>>;
  readonly selectedTrack: string | null;
  readonly previewRewards: boolean;
  readonly lastRound: RoundSnapshot | null;
}

const BRANCHES: readonly SkillBranch[] = [
  {
    id: 'medical',
    name: '醫療理解',
    shortName: 'MED',
    image: 'assets/skills/medical-understanding.jpg',
    accent: '#ff9d7f',
    description: '看見臨床情境、安全與真正需要改變的決策。',
  },
  {
    id: 'programming',
    name: '程式設計',
    shortName: 'CODE',
    image: 'assets/skills/programming.jpg',
    accent: '#67a9ff',
    description: '把一次性的想法變成能穩定運作的數位法術。',
  },
  {
    id: 'data',
    name: '資料分析',
    shortName: 'DATA',
    image: 'assets/skills/data-analysis.jpg',
    accent: '#64e3ca',
    description: '從混亂紀錄裡辨認規律、限制與可信證據。',
  },
  {
    id: 'ai',
    name: '人工智慧',
    shortName: 'AI',
    image: 'assets/skills/artificial-intelligence.jpg',
    accent: '#b58cff',
    description: '從使用模型走向訓練、驗證與創造模型。',
  },
  {
    id: 'product',
    name: '產品設計',
    shortName: 'UX',
    image: 'assets/skills/product-design.jpg',
    accent: '#c9ef72',
    description: '讓強大的技術成為人能理解、控制與使用的工具。',
  },
  {
    id: 'communication',
    name: '跨域溝通',
    shortName: 'TEAM',
    image: 'assets/skills/cross-disciplinary-communication.jpg',
    accent: '#ffc46e',
    description: '翻譯不同領域的語言，讓團隊朝同一個問題前進。',
  },
];

const SKILLS: readonly SkillItem[] = [
  {
    id: 'prompt',
    name: 'Prompt 基礎',
    branch: 'ai',
    tier: 1,
    description: '描述任務、限制與期待輸出。',
    canDo: '與生成式 AI 清楚協作',
  },
  {
    id: 'python',
    name: 'Python',
    branch: 'programming',
    tier: 1,
    description: '把問題拆成可重複執行的步驟。',
    canDo: '撰寫自動化程式',
  },
  {
    id: 'workflow',
    name: '流程自動化',
    branch: 'programming',
    tier: 1,
    description: '串起輸入、處理與輸出。',
    canDo: '批次完成重複任務',
  },
  {
    id: 'data-literacy',
    name: '資料判讀',
    branch: 'data',
    tier: 1,
    description: '理解欄位、來源與資料限制。',
    canDo: '辨認資料是否適合回答問題',
  },
  {
    id: 'data-pipeline',
    name: '資料處理',
    branch: 'data',
    tier: 1,
    description: '將混亂資料整理成可靠格式。',
    canDo: '建立可分析的資料集',
  },
  {
    id: 'user-research',
    name: '需求觀察',
    branch: 'product',
    tier: 1,
    description: '先理解使用者與工作情境。',
    canDo: '找出真正值得解決的問題',
  },
  {
    id: 'domain-translation',
    name: '跨域翻譯',
    branch: 'communication',
    tier: 1,
    description: '把抽象期待轉成共同規格。',
    canDo: '讓不同專業共同解題',
  },
  {
    id: 'data-cleaning',
    name: '資料清理',
    branch: 'data',
    tier: 2,
    description: '建立可追蹤的異常處理規則。',
    canDo: '改善資料品質',
  },
  {
    id: 'statistics',
    name: '統計推理',
    branch: 'data',
    tier: 2,
    description: '區分隨機波動與可信訊號。',
    canDo: '判斷發現是否可靠',
  },
  {
    id: 'visualization',
    name: '資料視覺化',
    branch: 'data',
    tier: 2,
    description: '將資料轉成團隊看得懂的線索。',
    canDo: '用圖表探索規律',
  },
  {
    id: 'storytelling',
    name: '證據敘事',
    branch: 'communication',
    tier: 2,
    description: '把資料發現連回決策與行動。',
    canDo: '清楚傳達分析結果',
  },
  {
    id: 'validation-code',
    name: '驗證程式',
    branch: 'programming',
    tier: 2,
    description: '自動檢查格式、範圍與缺漏。',
    canDo: '建立資料品質守門員',
  },
  {
    id: 'machine-learning',
    name: '機器學習',
    branch: 'ai',
    tier: 2,
    description: '讓模型從範例中學習規律。',
    canDo: '建立分類與預測模型',
  },
  {
    id: 'model-training',
    name: '模型訓練',
    branch: 'ai',
    tier: 2,
    description: '選擇特徵、演算法與學習方式。',
    canDo: '訓練自己的模型',
  },
  {
    id: 'model-validation',
    name: '模型驗證',
    branch: 'data',
    tier: 3,
    description: '用未知情境檢查模型能力。',
    canDo: '辨認偏差與泛化限制',
  },
  {
    id: 'ai-ethics',
    name: 'AI 倫理思維',
    branch: 'medical',
    tier: 2,
    description: '思考誤判、公平與使用風險。',
    canDo: '設計更負責任的 AI',
  },
  {
    id: 'explainable-ai',
    name: '可解釋 AI',
    branch: 'ai',
    tier: 3,
    description: '探索模型為何做出判斷。',
    canDo: '讓預測更容易被檢查',
  },
  {
    id: 'decision-communication',
    name: '決策溝通',
    branch: 'communication',
    tier: 2,
    description: '把模型輸出轉成可行動的說明。',
    canDo: '協助團隊理解 AI 結果',
  },
  {
    id: 'computer-vision',
    name: '電腦視覺',
    branch: 'ai',
    tier: 3,
    description: '讓模型從影像中辨認特徵。',
    canDo: '建立影像分類與偵測',
  },
  {
    id: 'image-labeling',
    name: '影像標註',
    branch: 'data',
    tier: 2,
    description: '建立一致且可驗證的影像答案。',
    canDo: '準備視覺模型資料集',
  },
  {
    id: 'vision-prototype',
    name: '視覺原型',
    branch: 'product',
    tier: 2,
    description: '讓影像結果能被人理解與修正。',
    canDo: '設計視覺 AI 互動',
  },
  {
    id: 'rag',
    name: 'RAG 知識檢索',
    branch: 'programming',
    tier: 3,
    description: '先搜尋可信資料，再交給模型回答。',
    canDo: '建立有來源的知識助手',
  },
  {
    id: 'knowledge-design',
    name: '知識設計',
    branch: 'data',
    tier: 2,
    description: '整理文件、來源與知識邊界。',
    canDo: '建立可檢索的知識庫',
  },
  {
    id: 'experience-design',
    name: 'AI 體驗設計',
    branch: 'product',
    tier: 2,
    description: '設計來源、限制與修正機制。',
    canDo: '打造能被信任的 AI 產品',
  },
  {
    id: 'agent-workflow',
    name: 'Agent 工作流',
    branch: 'programming',
    tier: 3,
    description: '讓多個工具依任務協作。',
    canDo: '建立能執行任務的 AI Agent',
  },
  {
    id: 'clinical-context',
    name: '臨床需求理解',
    branch: 'medical',
    tier: 2,
    description: '理解流程、角色與病人安全。',
    canDo: '定義真正的醫療問題',
  },
  {
    id: 'medical-safety',
    name: '病人安全思維',
    branch: 'medical',
    tier: 3,
    description: '把錯誤代價與防護帶進設計。',
    canDo: '規劃安全的醫療 AI',
  },
  {
    id: 'clinical-spec',
    name: '臨床規格翻譯',
    branch: 'communication',
    tier: 3,
    description: '把臨床期待寫成可驗證情境。',
    canDo: '連結臨床與工程團隊',
  },
];

const CAPABILITIES: readonly Capability[] = [
  {
    id: 'assistant',
    name: '文字魔法助手',
    description: '問答、摘要與內容生成。',
    requires: ['prompt'],
  },
  {
    id: 'automation',
    name: '自動化使魔',
    description: '讓程式批次完成重複任務。',
    requires: ['python', 'workflow'],
  },
  {
    id: 'data-scout',
    name: '資料偵察術',
    description: '先判讀資料，再建立可分析流程。',
    requires: ['data-literacy', 'data-pipeline'],
  },
  {
    id: 'discovery',
    name: '需求探索術',
    description: '從人與情境找出真正的任務。',
    requires: ['user-research', 'domain-translation'],
  },
  {
    id: 'reliable-data',
    name: '可信資料鍊成',
    description: '清理資料並用統計檢查證據。',
    requires: ['data-cleaning', 'statistics'],
  },
  {
    id: 'evidence-story',
    name: '證據可視化',
    description: '把複雜資料變成團隊能採取的行動。',
    requires: ['visualization', 'storytelling'],
  },
  {
    id: 'prediction',
    name: '預測魔型',
    description: '用自己的資料訓練分類與預測模型。',
    requires: ['machine-learning', 'model-training'],
  },
  {
    id: 'trustworthy-model',
    name: '可信魔型結界',
    description: '測試模型邊界並思考錯誤風險。',
    requires: ['model-validation', 'ai-ethics'],
  },
  {
    id: 'vision-system',
    name: '魔眼辨識術',
    description: '準備影像資料並建立視覺模型。',
    requires: ['computer-vision', 'image-labeling'],
  },
  {
    id: 'knowledge-system',
    name: '知識召喚陣',
    description: '讓 AI 查找可信來源後再回答。',
    requires: ['rag', 'knowledge-design'],
  },
  {
    id: 'agent',
    name: '任務型使魔',
    description: '讓 AI 串接工具並完成多步任務。',
    requires: ['python', 'agent-workflow'],
  },
  {
    id: 'clinical-ai',
    name: '臨床智策原型',
    description: '把臨床需求轉成可驗證的 AI 方案。',
    requires: ['clinical-context', 'clinical-spec'],
  },
];

const REGIONS: readonly WorldRegion[] = [
  {
    id: 'prompt-academy',
    chapter: 'PROLOGUE',
    name: '星引學院',
    subtitle: '冒險者的起點',
    icon: '✦',
    kind: 'start',
    x: 20,
    y: 76,
    requiresRegions: [],
    scene: 'assets/scenes/code-workshop.png',
    speaker: '引導員 Lumi',
    briefing: '你帶著 Prompt 基礎進入星引學院。這是一種好用的魔法，但能力大陸遠比一段咒語廣闊。',
    question: '',
    options: [],
  },
  {
    id: 'code-workshop',
    chapter: 'QUEST 01',
    name: '符文程式工坊',
    subtitle: '三百份回饋的委託',
    icon: '{ }',
    kind: 'main',
    x: 10,
    y: 46,
    requiresRegions: ['prompt-academy'],
    scene: 'assets/scenes/code-workshop.png',
    speaker: '工坊導師 Lumi',
    briefing: '學院收到三百份冒險者回饋。每一份都能用 Prompt 分析，但逐份處理會花掉整晚。',
    question: '你想先用哪一種方法打開局面？',
    options: [
      {
        archetype: '構築者',
        icon: '⌘',
        label: '把重複步驟寫成程式',
        detail: '建立迴圈，逐筆讀取、處理並保存結果。',
        consequence: '你把一次操作變成能穩定重複的數位法術。工坊開始自動運轉。',
        rewards: ['python', 'workflow'],
      },
      {
        archetype: '資料偵察者',
        icon: '◇',
        label: '先查看資料長什麼樣子',
        detail: '觀察欄位、格式、缺漏與可以回答的問題。',
        consequence: '你沒有急著施法，而是先看懂材料。團隊避開了許多錯誤假設。',
        rewards: ['data-literacy', 'data-pipeline'],
      },
      {
        archetype: '需求觀察者',
        icon: '◎',
        label: '先問委託人真正想知道什麼',
        detail: '訪談使用者，確認結果將支持哪個決定。',
        consequence: '你把模糊的「分析一下」翻譯成清楚任務，大家終於知道要往哪裡走。',
        rewards: ['user-research', 'domain-translation'],
      },
    ],
  },
  {
    id: 'data-archive',
    chapter: 'QUEST 02',
    name: '水晶資料典藏室',
    subtitle: '混亂紀錄的低語',
    icon: '▥',
    kind: 'main',
    x: 29,
    y: 24,
    requiresRegions: ['code-workshop'],
    scene: 'assets/scenes/data-archive.png',
    speaker: '典藏官 Lumi',
    briefing: '一批健康紀錄送進典藏室：年齡出現 999、日期格式混在一起，許多欄位閃爍著缺漏警示。',
    question: '面對這批資料，你最想先追查哪一條線索？',
    options: [
      {
        archetype: '資料鍊金師',
        icon: '△',
        label: '保留原始資料並制定清理規則',
        detail: '查資料字典、標記異常，記錄每一項處理決策。',
        consequence: '混濁的資料逐漸結晶，所有修正都有來源與依據。',
        rewards: ['data-cleaning', 'statistics'],
      },
      {
        archetype: '圖譜吟遊者',
        icon: '⌁',
        label: '把分布與缺漏畫成探索圖',
        detail: '用視覺化讓團隊一起觀察資料現況。',
        consequence: '看不見的規律浮上水晶牆，團隊第一次共享了同一幅資料地圖。',
        rewards: ['visualization', 'storytelling'],
      },
      {
        archetype: '品質守門人',
        icon: '⬡',
        label: '寫一套自動驗證咒式',
        detail: '檢查格式、範圍、重複與缺漏，攔下不合規資料。',
        consequence: '你在典藏室入口立起資料結界，新的錯誤再也無法悄悄混入。',
        rewards: ['validation-code', 'data-pipeline'],
      },
    ],
  },
  {
    id: 'ml-forest',
    chapter: 'QUEST 03',
    name: '機器學習森林',
    subtitle: '會學習的神經古樹',
    icon: '♢',
    kind: 'main',
    x: 51,
    y: 49,
    requiresRegions: ['data-archive'],
    scene: 'assets/scenes/ml-forest.png',
    speaker: '森林守望者 Lumi',
    briefing:
      '神經古樹會從你交給它的範例中生長。三條道路分別通往預測、驗證與解釋，沒有一條是唯一答案。',
    question: '第一輪培育，你想讓古樹先學會什麼？',
    options: [
      {
        archetype: '魔型工程師',
        icon: '✦',
        label: '從範例中訓練第一個預測魔型',
        detail: '選擇特徵與學習方法，讓模型預測未知案例。',
        consequence: '古樹根系記住了資料規律，一個能預測新案例的魔型誕生。',
        rewards: ['machine-learning', 'model-training'],
      },
      {
        archetype: '結界驗證師',
        icon: '◈',
        label: '先探索模型會在哪裡失效',
        detail: '設計陌生資料與困難案例，觀察偏差和錯誤代價。',
        consequence: '你沒有被漂亮分數迷惑，而是畫出了魔型力量的邊界。',
        rewards: ['model-validation', 'ai-ethics'],
      },
      {
        archetype: '因果解讀者',
        icon: '☼',
        label: '追問模型為什麼做出判斷',
        detail: '觀察重要特徵，將預測翻譯成團隊能理解的說明。',
        consequence: '原本沉默的模型開始顯示判斷線索，人與 AI 之間多了一座橋。',
        rewards: ['explainable-ai', 'decision-communication'],
      },
    ],
  },
  {
    id: 'vision-observatory',
    chapter: 'SPECIAL QUEST',
    name: '魔眼觀測台',
    subtitle: '視覺獵人的試煉',
    icon: '◉',
    kind: 'specialization',
    x: 68,
    y: 28,
    requiresRegions: ['ml-forest'],
    scene: 'assets/scenes/vision-observatory.png',
    speaker: '魔眼監察官 Lumi',
    briefing: '高空稜鏡送來不同光線、設備與角度的影像。每一張圖都可能改變魔眼的判斷。',
    question: '你會如何開始打造自己的視覺魔法？',
    options: [
      {
        archetype: '視覺獵人',
        icon: '◉',
        label: '與專家建立一致的影像標註',
        detail: '定義類別、邊界與不確定案例，再訓練辨識模型。',
        consequence: '你的魔眼學會辨認影像特徵，也知道可靠答案從何而來。',
        rewards: ['computer-vision', 'image-labeling'],
      },
      {
        archetype: '跨域觀測者',
        icon: '⌖',
        label: '比較不同環境下的影像表現',
        detail: '檢查設備、光線、族群與資料分布差異。',
        consequence: '你看見同一套魔眼在不同世界的能力邊界。',
        rewards: ['model-validation', 'data-literacy'],
      },
      {
        archetype: '視界設計師',
        icon: '◇',
        label: '先設計人如何檢查與修正結果',
        detail: '把模型輸出做成能回饋、覆核的互動原型。',
        consequence: '魔眼不再只輸出答案，而成為人能理解與控制的工具。',
        rewards: ['vision-prototype', 'experience-design'],
      },
    ],
  },
  {
    id: 'language-library',
    chapter: 'SPECIAL QUEST',
    name: '萬語秘典城',
    subtitle: '語言咒術師的試煉',
    icon: '✧',
    kind: 'specialization',
    x: 80,
    y: 70,
    requiresRegions: ['ml-forest'],
    scene: 'assets/scenes/language-library.png',
    speaker: '秘典司書 Lumi',
    briefing: '課程問答使魔會流暢回答，卻偶爾引用不存在的規章。秘典城提供三種強化道路。',
    question: '你想先為這隻語言使魔裝上哪種能力？',
    options: [
      {
        archetype: '語言咒術師',
        icon: '✧',
        label: '讓它先查秘典，再根據來源回答',
        detail: '檢索相關文件，將內容與問題一起交給模型。',
        consequence: '語言使魔學會從秘典召喚知識，回答也開始帶有可追查來源。',
        rewards: ['rag', 'knowledge-design'],
      },
      {
        archetype: '對話編織師',
        icon: '∞',
        label: '設計來源、限制與修正方式',
        detail: '讓使用者知道如何查證，也能回報錯誤。',
        consequence: '你為魔法加上人能掌握的韁繩，流暢回答不再等於盲目信任。',
        rewards: ['experience-design', 'prompt'],
      },
      {
        archetype: '使魔調度師',
        icon: '⌘',
        label: '讓它能呼叫工具完成多步任務',
        detail: '規劃工作流、工具權限與每一步的檢查點。',
        consequence: '語言使魔不只會說，也開始能安全地使用工具完成任務。',
        rewards: ['agent-workflow', 'python'],
      },
    ],
  },
  {
    id: 'medical-observatory',
    chapter: 'SPECIAL QUEST',
    name: '星脈醫療觀測站',
    subtitle: '智療策士的試煉',
    icon: '＋',
    kind: 'specialization',
    x: 88,
    y: 18,
    requiresRegions: ['ml-forest'],
    scene: 'assets/scenes/medical-observatory.png',
    speaker: '醫療觀測官 Lumi',
    briefing: '醫院希望 AI 提醒高風險個案，但醫師、工程師與管理者對「高風險」各有不同理解。',
    question: '你會從哪個位置開始連結醫療與 AI？',
    options: [
      {
        archetype: '臨床探路者',
        icon: '＋',
        label: '走進現場觀察預測如何改變決策',
        detail: '定義誰在何時看到結果，接著能採取什麼行動。',
        consequence: '你找到真正需要 AI 出現的時刻，技術終於連上照護流程。',
        rewards: ['clinical-context', 'user-research'],
      },
      {
        archetype: '安全結界師',
        icon: '⬡',
        label: '先找出誤判與誤用可能造成的傷害',
        detail: '把病人安全、錯誤代價與防護措施放進設計。',
        consequence: '你在模型周圍建立安全結界，團隊開始看見準確率之外的責任。',
        rewards: ['medical-safety', 'model-validation'],
      },
      {
        archetype: '智療策士',
        icon: '✚',
        label: '把臨床期待翻成可驗證的使用情境',
        detail: '明確定義對象、時間點、輸出、行動與評估方式。',
        consequence: '三種專業語言被寫成同一份任務卷軸，跨域團隊終於能共同前進。',
        rewards: ['clinical-spec', 'domain-translation'],
      },
    ],
  },
  {
    id: 'career-citadel',
    chapter: 'CAREER GATE',
    name: '職涯星冠城',
    subtitle: '你的技能將形成職業',
    icon: '★',
    kind: 'career',
    x: 92,
    y: 48,
    requiresRegions: [],
    scene: 'assets/world/ai-continent.png',
    speaker: '',
    briefing: '',
    question: '',
    options: [],
  },
];

const CAREERS: readonly CareerProfile[] = [
  {
    regionId: 'vision-observatory',
    kicker: 'COMPUTER VISION CLASS',
    className: '視覺獵人',
    realWorldTitle: 'Computer Vision Explorer',
    description:
      '你擅長追蹤光影、資料與模型之間的細微差異。視覺獵人不只是訓練辨識模型，也會查明影像如何被標註、模型在何處失效。',
    formula: ['影像理解', '資料驗證', '模型設計'],
    careers: ['電腦視覺工程師', '醫療影像 AI 工程師', '機器人感知工程師'],
    research: ['影像辨識與分割', '多模態學習', '醫學影像分析', '模型泛化'],
    nextSkills: ['PyTorch', 'Vision Transformer', '影像標註工具', 'MLOps'],
  },
  {
    regionId: 'language-library',
    kicker: 'LANGUAGE AI CLASS',
    className: '語言咒術師',
    realWorldTitle: 'Language AI Builder',
    description:
      '你能讓語言模型連上知識、工具與使用者。真正的咒術不只是一句 Prompt，而是讓檢索、模型、介面與回饋形成可靠系統。',
    formula: ['Prompt', '知識檢索', '互動設計'],
    careers: ['LLM 應用工程師', 'AI 產品工程師', '知識系統設計師'],
    research: ['自然語言處理', '資訊檢索', 'AI Agent', '可信任生成式 AI'],
    nextSkills: ['向量資料庫', 'LLM API', 'Evaluation', 'Agent workflow'],
  },
  {
    regionId: 'medical-observatory',
    kicker: 'HEALTH AI CLASS',
    className: '智療策士',
    realWorldTitle: 'Healthcare AI Strategist',
    description:
      '你能在醫療與工程之間翻譯真正的問題，讓魔型回到臨床流程、安全與行動。這條路特別需要跨域理解。',
    formula: ['醫療理解', '模型驗證', '跨域翻譯'],
    careers: ['醫療 AI 工程師', '臨床資料科學家', '數位健康產品人才'],
    research: ['臨床決策支援', '醫療資料科學', '可信任醫療 AI', '數位健康'],
    nextSkills: ['醫療資料標準', '生物統計', '臨床驗證', '醫療 AI 倫理'],
  },
];

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly storageKey = 'ai-academy-adventure-v3';

  protected readonly view = signal<View>('intro');
  protected readonly acquiredSkills = signal<readonly string[]>(['prompt']);
  protected readonly completedRegions = signal<readonly string[]>(['prompt-academy']);
  protected readonly choices = signal<Readonly<Record<string, number>>>({});
  protected readonly activeRegionId = signal<string | null>(null);
  protected readonly questPhase = signal<QuestPhase>('dialogue');
  protected readonly selectedOption = signal<number | null>(null);
  protected readonly newlyUnlockedCapabilities = signal<readonly string[]>([]);
  protected readonly selectedTrack = signal<string | null>(null);
  protected readonly lastRound = signal<RoundSnapshot | null>(null);
  protected readonly previewRewards = signal(false);
  protected readonly collectionOpen = signal(false);
  protected readonly settingsOpen = signal(false);

  protected readonly branches = BRANCHES;
  protected readonly skills = SKILLS;
  protected readonly capabilities = CAPABILITIES;
  protected readonly regions = REGIONS;
  protected readonly careers = CAREERS;

  protected readonly activeRegion = computed(
    () => this.regions.find((region) => region.id === this.activeRegionId()) ?? null,
  );
  protected readonly selectedQuestOption = computed(() => {
    const region = this.activeRegion();
    const index = this.selectedOption();
    return region && index !== null ? (region.options[index] ?? null) : null;
  });
  protected readonly acquiredSkillSet = computed(() => new Set(this.acquiredSkills()));
  protected readonly unlockedCapabilities = computed(() =>
    this.capabilities.filter((capability) =>
      capability.requires.every((skillId) => this.acquiredSkillSet().has(skillId)),
    ),
  );
  protected readonly playerLevel = computed(() => Math.max(1, this.completedRegions().length));
  protected readonly hasSpecialization = computed(() =>
    this.regions.some(
      (region) => region.kind === 'specialization' && this.completedRegions().includes(region.id),
    ),
  );
  protected readonly progressPercent = computed(() => {
    const quests = this.regions.filter(
      (region) => region.kind === 'main' || region.kind === 'specialization',
    );
    return Math.round(
      (quests.filter((region) => this.completedRegions().includes(region.id)).length /
        quests.length) *
        100,
    );
  });
  protected readonly activeCareer = computed(
    () =>
      this.careers.find((career) => career.regionId === this.selectedTrack()) ??
      this.careers.find((career) => this.completedRegions().includes(career.regionId)) ??
      this.careers[0],
  );
  protected readonly currentClassName = computed(() => {
    const completed = this.careers.find((career) =>
      this.completedRegions().includes(career.regionId),
    );
    if (completed) return completed.className;
    const ai = this.branchProgress('ai');
    const code = this.branchProgress('programming');
    const data = this.branchProgress('data');
    if (ai >= 2 && code >= 1) return '魔型工程師';
    if (data >= 2) return '資料鍊金師';
    return '星引學徒';
  });

  constructor() {
    this.restoreState();
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      const state: SavedState = {
        view: this.view() === 'quest' ? 'map' : this.view(),
        acquiredSkills: this.acquiredSkills(),
        completedRegions: this.completedRegions(),
        choices: this.choices(),
        selectedTrack: this.selectedTrack(),
        previewRewards: this.previewRewards(),
        lastRound: this.lastRound(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    });
  }

  protected startAdventure(): void {
    this.view.set('map');
    this.scrollToTop();
  }
  protected goHome(): void {
    this.closeOverlays();
    this.view.set('intro');
    this.scrollToTop();
  }
  protected goToMap(): void {
    this.closeOverlays();
    this.view.set('map');
    this.activeRegionId.set(null);
    this.scrollToTop();
  }
  protected openCollection(): void {
    this.collectionOpen.set(true);
  }
  protected closeCollection(): void {
    this.collectionOpen.set(false);
  }
  protected openSettings(): void {
    this.settingsOpen.set(true);
  }
  protected closeSettings(): void {
    this.settingsOpen.set(false);
  }
  protected toggleRewardPreview(): void {
    this.previewRewards.update((value) => !value);
  }

  protected openRegion(region: WorldRegion): void {
    if (this.regionStatus(region) === 'locked') return;
    if (region.kind === 'start') {
      this.openCollection();
      return;
    }
    if (region.kind === 'career') {
      this.view.set('career');
      this.scrollToTop();
      return;
    }
    this.activeRegionId.set(region.id);
    const savedChoice = this.choices()[region.id];
    this.selectedOption.set(typeof savedChoice === 'number' ? savedChoice : null);
    this.questPhase.set(typeof savedChoice === 'number' ? 'result' : 'dialogue');
    this.newlyUnlockedCapabilities.set([]);
    if (region.kind === 'specialization') this.selectedTrack.set(region.id);
    this.view.set('quest');
    this.scrollToTop();
  }

  protected revealChoices(): void {
    this.questPhase.set('choice');
  }

  protected chooseQuestOption(index: number): void {
    const region = this.activeRegion();
    const option = region?.options[index];
    if (!region || !option || this.completedRegions().includes(region.id)) return;

    const snapshot: RoundSnapshot = {
      regionId: region.id,
      acquiredSkills: this.acquiredSkills(),
      completedRegions: this.completedRegions(),
      choices: this.choices(),
      selectedTrack: this.selectedTrack(),
    };
    const capabilitiesBefore = new Set(
      this.unlockedCapabilities().map((capability) => capability.id),
    );
    const nextSkills = [...new Set([...this.acquiredSkills(), ...option.rewards])];
    const nextSkillSet = new Set(nextSkills);
    const newCapabilities = this.capabilities
      .filter(
        (capability) =>
          !capabilitiesBefore.has(capability.id) &&
          capability.requires.every((skillId) => nextSkillSet.has(skillId)),
      )
      .map((capability) => capability.id);

    this.lastRound.set(snapshot);
    this.acquiredSkills.set(nextSkills);
    this.completedRegions.update((completed) => [...new Set([...completed, region.id])]);
    this.choices.update((choices) => ({ ...choices, [region.id]: index }));
    if (region.kind === 'specialization') this.selectedTrack.set(region.id);
    this.selectedOption.set(index);
    this.newlyUnlockedCapabilities.set(newCapabilities);
    this.questPhase.set('result');
  }

  protected undoLastRound(): void {
    const snapshot = this.lastRound();
    if (!snapshot) return;
    this.acquiredSkills.set(snapshot.acquiredSkills);
    this.completedRegions.set(snapshot.completedRegions);
    this.choices.set(snapshot.choices);
    this.selectedTrack.set(snapshot.selectedTrack);
    this.activeRegionId.set(snapshot.regionId);
    this.selectedOption.set(null);
    this.newlyUnlockedCapabilities.set([]);
    this.lastRound.set(null);
    this.questPhase.set('dialogue');
    this.view.set('quest');
    this.scrollToTop();
  }

  protected showCareer(regionId: string): void {
    if (!this.completedRegions().includes(regionId)) return;
    this.selectedTrack.set(regionId);
    this.view.set('career');
    this.scrollToTop();
  }

  protected restart(): void {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('確定要清除所有技能與任務進度，回到星引學院入口嗎？')
    )
      return;
    this.view.set('intro');
    this.acquiredSkills.set(['prompt']);
    this.completedRegions.set(['prompt-academy']);
    this.choices.set({});
    this.activeRegionId.set(null);
    this.selectedTrack.set(null);
    this.lastRound.set(null);
    this.collectionOpen.set(false);
    this.settingsOpen.set(false);
    this.newlyUnlockedCapabilities.set([]);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey);
    this.scrollToTop();
  }

  protected regionStatus(region: WorldRegion): 'completed' | 'open' | 'locked' {
    if (this.completedRegions().includes(region.id)) return 'completed';
    if (region.kind === 'career') return this.hasSpecialization() ? 'open' : 'locked';
    return region.requiresRegions.every((regionId) => this.completedRegions().includes(regionId))
      ? 'open'
      : 'locked';
  }

  protected regionStatusLabel(region: WorldRegion): string {
    const status = this.regionStatus(region);
    if (status === 'completed') return '探索完成';
    if (status === 'open') return region.kind === 'career' ? '查看職涯' : '可接受任務';
    return '迷霧籠罩';
  }

  protected branchProgress(branchId: BranchId): number {
    return this.skills.filter(
      (skill) => skill.branch === branchId && this.acquiredSkillSet().has(skill.id),
    ).length;
  }
  protected branchSkills(branchId: BranchId): readonly SkillItem[] {
    return this.skills.filter(
      (skill) => skill.branch === branchId && this.acquiredSkillSet().has(skill.id),
    );
  }
  protected skillById(skillId: string): SkillItem | null {
    return this.skills.find((skill) => skill.id === skillId) ?? null;
  }
  protected branchForSkill(skillId: string): SkillBranch | null {
    const skill = this.skillById(skillId);
    return this.branches.find((branch) => branch.id === skill?.branch) ?? null;
  }
  protected capabilityById(capabilityId: string): Capability | null {
    return this.capabilities.find((capability) => capability.id === capabilityId) ?? null;
  }
  protected trackIsComplete(regionId: string): boolean {
    return this.completedRegions().includes(regionId);
  }
  protected canUndoRegion(regionId: string): boolean {
    return this.lastRound()?.regionId === regionId;
  }
  protected chosenOptionFor(regionId: string): QuestOption | null {
    const region = this.regions.find((item) => item.id === regionId);
    const index = this.choices()[regionId];
    return region && typeof index === 'number' ? (region.options[index] ?? null) : null;
  }

  private closeOverlays(): void {
    this.collectionOpen.set(false);
    this.settingsOpen.set(false);
  }
  private restoreState(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as Partial<SavedState>;
      const validSkills = new Set(this.skills.map((skill) => skill.id));
      const validRegions = new Set(this.regions.map((region) => region.id));
      if (Array.isArray(state.acquiredSkills))
        this.acquiredSkills.set([
          ...new Set(['prompt', ...state.acquiredSkills.filter((id) => validSkills.has(id))]),
        ]);
      if (Array.isArray(state.completedRegions))
        this.completedRegions.set([
          ...new Set([
            'prompt-academy',
            ...state.completedRegions.filter((id) => validRegions.has(id)),
          ]),
        ]);
      if (state.choices && typeof state.choices === 'object') this.choices.set(state.choices);
      if (
        typeof state.selectedTrack === 'string' &&
        this.careers.some((career) => career.regionId === state.selectedTrack)
      )
        this.selectedTrack.set(state.selectedTrack);
      if (typeof state.previewRewards === 'boolean') this.previewRewards.set(state.previewRewards);
      if (state.lastRound && validRegions.has(state.lastRound.regionId))
        this.lastRound.set(state.lastRound);
      if (state.view === 'career' || state.view === 'map' || state.view === 'intro')
        this.view.set(state.view);
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
