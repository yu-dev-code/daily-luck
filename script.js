// ===============================
import { messagesMorning } from "./messages/morning.js";
import { messagesAfternoon } from "./messages/afternoon.js";
import { messagesNight } from "./messages/night.js";
import { messagesDeepnight } from "./messages/deepnight.js";

const DISABLE_DAILY_LIMIT = true; // テスト中は true　falseに本番は戻す

const fortunes = messagesMorning;
const noonMessages = messagesAfternoon;
const nightMessages = messagesNight;

// ===============================
// JSTユーティリティ
// ===============================
const TZ = "Asia/Tokyo";

function getJSTParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    y: map.year,
    m: map.month,
    d: map.day,
    hh: Number(map.hour),
  };
}

function getSlotByHour(hh) {
  if (hh < 6) return "deepnight";
  if (hh < 12) return "morning";
  if (hh < 18) return "afternoon";
  return "night";
}

function slotLabel(slot) {
  if (slot === "deepnight") return "深夜";
  if (slot === "morning") return "朝";
  if (slot === "afternoon") return "昼";
  return "夜";
}

function guideText(slot) {
  if (slot === "deepnight") return "🌑 静かなメッセージ";
  if (slot === "morning") return "☀️ 本日の流れ";
  if (slot === "afternoon") return "🌤 軽いヒント";
  return "🌙 ねぎらい／問いかけ";
}

function storageKey(dateStr, slot) {
  return `used:${dateStr}:${slot}`;
}

function pickMessage(slot) {
  if (slot === "morning") {
    const r = fortunes[Math.floor(Math.random() * fortunes.length)];
    return `<strong>${r.name}</strong><br>${r.message}`;
  }
  if (slot === "afternoon") {
    return noonMessages[Math.floor(Math.random() * noonMessages.length)];
  }
  return nightMessages[Math.floor(Math.random() * nightMessages.length)];
}

// ===============================
// DOM
// ===============================
const btn = document.getElementById("btn");
const resultEl = document.getElementById("result");
const guideEl = document.getElementById("guide");
const container = document.querySelector(".container");

const deepnightArea = document.getElementById("deepnightArea");
const deepnightVideo = document.getElementById("deepnightVideo");
const deepnightSoundBtn = document.getElementById("deepnightSoundBtn");
const deepnightPlayBtn = document.getElementById("deepnightPlayBtn");

// ★③ 動画タップで再生 / 停止トグル
if (deepnightVideo) {
  deepnightVideo.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (deepnightVideo.paused || deepnightVideo.ended) {
      try { await deepnightVideo.play(); } catch (err) { console.warn(err); }
    } else {
      deepnightVideo.pause();
    }
  });
}


// 初期状態
deepnightArea.style.display = "none";
refreshGuide();

// ===============================
// 表示系
// ===============================
function showResult(html) {
  resultEl.innerHTML = html;
  resultEl.style.display = "inline-block";
  resultEl.classList.add("show");
}

function refreshGuide() {
  const { hh } = getJSTParts();
  guideEl.textContent = guideText(getSlotByHour(hh));
}

function deepnightUsedKey(dateStr) {
  return `used:deepnight:${dateStr}`;
}


// ===============================
// 音声トグル（深夜のみ表示される前提）
// ===============================
deepnightSoundBtn.addEventListener("click", () => {
  deepnightVideo.muted = !deepnightVideo.muted;
  deepnightSoundBtn.textContent =
    deepnightVideo.muted ? "🔈 音をON" : "🔇 ミュート";
});

async function toggleDeepnightVideo() {
  const { y, m, d } = getJSTParts();
  const dateStr = `${y}-${m}-${d}`;
  const usedKey = deepnightUsedKey(dateStr);

if (deepnightPlayBtn) {
  deepnightPlayBtn.addEventListener("click", async () => {
    if (deepnightVideo.paused || deepnightVideo.ended) {
      try { await deepnightVideo.play(); } catch (e) { console.warn(e); }
      deepnightPlayBtn.textContent = "⏸ 停止";
    } else {
      deepnightVideo.pause();
      deepnightPlayBtn.textContent = "▶ 再生";
    }
  });

  // 動画タップで切り替えた時もボタン表示を同期
  deepnightVideo.addEventListener("play", () => deepnightPlayBtn.textContent = "⏸ 停止");
  deepnightVideo.addEventListener("pause", () => deepnightPlayBtn.textContent = "▶ 再生");
}


  // =========================
  // 本番：深夜は1日1回だけ
  // =========================
  if (!DISABLE_DAILY_LIMIT && localStorage.getItem(usedKey) === "1") {
    // 体験済み：何もしない（静かに終了）
    return;
  }

  deepnightArea.style.display = "block";
  document.body.classList.add("deepnight-playing");
  

  // 初回のみ：その日の動画を決定 一時動画確認のため差し替え　テスト後もどす
  if (!deepnightVideo.src) {
    const r = messagesDeepnight[Math.floor(Math.random() * messagesDeepnight.length)];
    deepnightVideo.src = r.videoUrl;
    deepnightVideo.muted = true;
    deepnightVideo.loop = false;
    deepnightVideo.load();
  }

// テスト中：毎回ランダム 動画確認用時上と差し替える
// const shouldRePick = DISABLE_DAILY_LIMIT;

// if (shouldRePick || !deepnightVideo.src) {
//   const r = messagesDeepnight[Math.floor(Math.random() * messagesDeepnight.length)];
//   deepnightVideo.src = r.videoUrl;
//   deepnightVideo.muted = true;
//   deepnightVideo.loop = false;
//   deepnightVideo.load();
// }


  // 初回体験として再生
  try {
    await deepnightVideo.play();
    if (!DISABLE_DAILY_LIMIT) {
      localStorage.setItem(usedKey, "1");
    }
  } catch (e) {
    console.warn(e);
  }
}

btn.addEventListener("click", async (e) => {
  e.preventDefault();

  const slot = getTimeSlotJST();
  const { y, m, d } = getJSTParts();
  const dateStr = `${y}-${m}-${d}`;

  // 深夜
  if (slot === "deepnight") {
    btn.style.display = "none";
    await toggleDeepnightVideo();
    return;
  }

  // 朝・昼・夜
  deepnightArea.style.display = "none";
  deepnightVideo.pause();
  document.body.classList.remove("deepnight-playing");

  const key = storageKey(dateStr, slot);
  if (!DISABLE_DAILY_LIMIT && localStorage.getItem(key) === "1") {
    showResult(`今回${slotLabel(slot)}のヒント。<br>また次回😊`);
    container.classList.add("has-result");
    btn.textContent = "また次回😊";
    btn.classList.add("used");
    return;
  }

  showResult(pickMessage(slot));
  container.classList.add("has-result");
  localStorage.setItem(key, "1");
  btn.style.display = "none";


});
// ===== 開発用：時間帯を強制 =====
const FORCE_SLOT = "deepnight"; // "night" / "deepnight" / null最後に消す！！

function getTimeSlotJST() {
  if (FORCE_SLOT) return FORCE_SLOT;  //最後に消す！！

  const { hh } = getJSTParts();
  if (hh < 6) return "deepnight";
  if (hh < 12) return "morning";
  if (hh < 18) return "afternoon";
  return "night";
}

function applyTimeClass(slot) {
  document.body.classList.remove("morning", "afternoon", "night", "deepnight");
  document.body.classList.add(slot);
}

// ★起動時に即反映
const slotNow = getTimeSlotJST();
applyTimeClass(slotNow);
guideEl.textContent = guideText(slotNow);

