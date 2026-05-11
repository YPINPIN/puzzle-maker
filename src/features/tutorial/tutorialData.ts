import type { IconName } from '../../components/Icon';

export type TutorialStep = {
  targetId: string | null;
  titleIcon: IconName | null;
  title: string;
  highlights?: string[];
  message: string;
  ctaLabel: string;
};

export const homeSteps: TutorialStep[] = [
  {
    targetId: null,
    titleIcon: 'brand-mark',
    title: '嗨！歡迎來到拼圖樂',
    message: '我是你的教學小幫手！讓我帶你快速認識這裡的功能，不超過一分鐘！',
    ctaLabel: '好啊，帶我看看！',
  },
  {
    targetId: 'home-new-puzzle',
    titleIcon: 'ic-image',
    title: '建立新拼圖',
    highlights: ['自己的照片', '內建圖片'],
    message: '從這裡開始新的拼圖冒險！上傳自己的照片，或從內建圖片中挑選喜歡的圖案。',
    ctaLabel: '明白了！',
  },
  {
    targetId: 'home-quick-start',
    titleIcon: 'ic-sparkle',
    title: '快速開局',
    highlights: ['一鍵就能'],
    message: '玩過的設定會自動儲存在這裡，下次一鍵就能用同一張圖片設定立刻開始！',
    ctaLabel: '好方便！',
  },
  {
    targetId: 'home-load-save',
    titleIcon: 'ic-folder',
    title: '讀取存檔',
    highlights: ['隨時回來繼續'],
    message: '臨時有事要暫停？這裡保存了你的遊戲進度，隨時回來繼續挑戰！',
    ctaLabel: '了解了！',
  },
  {
    targetId: 'home-new-puzzle',
    titleIcon: 'ic-target',
    title: '準備好了！',
    highlights: ['第一場拼圖'],
    message: '功能介紹完畢！現在讓我們一起玩第一場拼圖吧～按下按鈕開始！',
    ctaLabel: '我要建立新拼圖！',
  },
];

export const uploadStep: TutorialStep = {
  targetId: 'upload-area',
  titleIcon: 'ic-image',
  title: '選一張圖片',
  highlights: ['選用內建圖片', '確定圖片'],
  message: '可以上傳自己的照片，或點選「選用內建圖片」挑選精美圖案！選好後按右上角「確定圖片」繼續。',
  ctaLabel: '好，我來選！',
};

export const configStep: TutorialStep = {
  targetId: 'config-difficulty',
  titleIcon: 'ic-settings',
  title: '選擇難度',
  highlights: ['簡單', '選擇拼圖區域'],
  message: '選擇難度和格數！初學者推薦「簡單」，格子越多挑戰越大。選好後按右上角「選擇拼圖區域」繼續！',
  ctaLabel: '知道了，開始設定！',
};

export const cropStep: TutorialStep = {
  targetId: 'crop-image',
  titleIcon: 'ic-crop',
  title: '裁切拼圖範圍',
  highlights: ['拖曳移動裁切框', '開始拼圖'],
  message: '拖曳移動裁切框，讓主題在正中間！調整好後按右上角「開始拼圖」，馬上進入遊戲！',
  ctaLabel: '好的，我來調整！',
};

export const playSteps: TutorialStep[] = [
  {
    targetId: null,
    titleIcon: 'brand-mark',
    title: '拼圖準備好了！',
    highlights: ['計時還沒開始'],
    message: '開始前讓我快速介紹遊戲介面，放心，計時還沒開始唷！',
    ctaLabel: '讓我看看！',
  },
  {
    targetId: 'play-timer',
    titleIcon: 'ic-timer',
    title: '計時器',
    message: '這裡記錄你的遊戲時間。教學完成後才開始計時，不用擔心！',
    ctaLabel: '好！',
  },
  {
    targetId: 'play-difficulty',
    titleIcon: 'ic-lightbulb',
    title: '難度 & 燈泡提示',
    highlights: ['燈泡按鈕', '格線淡色提示圖'],
    message: '左側顯示難度和格數；燈泡按鈕可開啟格線淡色提示圖，初學者必備！',
    ctaLabel: '明白了！',
  },
  {
    targetId: 'play-reference',
    titleIcon: 'ic-eye',
    title: '參考圖',
    highlights: ['查看原圖'],
    message: '忘記圖片長什麼樣？按這裡查看原圖，幫助你找對位置！',
    ctaLabel: '真棒！',
  },
  {
    targetId: 'play-pause',
    titleIcon: 'ic-pause',
    title: '暫停',
    highlights: ['計時器也會跟著暫停'],
    message: '需要休息隨時按這裡，計時器也會跟著暫停。',
    ctaLabel: '了解！',
  },
  {
    targetId: 'play-save',
    titleIcon: 'ic-save',
    title: '保存並結束',
    highlights: ['讀取存檔'],
    message: '想先結束之後再繼續？按這個金色按鈕保存進度，下次從「讀取存檔」繼續！',
    ctaLabel: '好的！',
  },
  {
    targetId: 'play-end',
    titleIcon: 'ic-stop',
    title: '結束',
    highlights: ['自動暫存', '繼續上局', '保存並結束'],
    message: '直接離開遊戲並回到首頁，系統會自動暫存目前進度，下次可從首頁「繼續上局」恢復。若需保留進度請改用「保存並結束」。',
    ctaLabel: '知道了！',
  },
  {
    targetId: 'play-zoom-control',
    titleIcon: 'ic-zoom-in',
    title: '縮放工具',
    highlights: ['放大畫面'],
    message: '底部可以放大畫面讓操作更精準，放大後也能拖曳移動！',
    ctaLabel: '好！',
  },
  {
    targetId: 'play-board',
    titleIcon: 'ic-target',
    title: '如何移動拼圖',
    highlights: ['拖曳', '自動吸附'],
    message: '點住任一拼圖片後拖曳到對應位置，放開時若位置正確會自動吸附對齊！',
    ctaLabel: '了解！',
  },
  {
    targetId: null,
    titleIcon: 'ic-play',
    title: '開始囉！',
    message: '全部介紹完畢！計時現在開始，祝你玩得開心！',
    ctaLabel: '衝！開始拼圖！',
  },
];
