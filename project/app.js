// 적극행정 신호등 — 화면 이동
const SCREENS = ["home", "write", "check", "result"];

function showScreen(name) {
  if (!SCREENS.includes(name)) name = "home";
  // 기록 없이 점검·결과 화면으로 바로 오면 앞 단계로 보내요
  if (name === "check" && !draft) return go("write");
  if (name === "result" && !viewing && !(draft && draft.signal)) return go("home");
  if (name !== "result" && viewing) setViewing(null);
  if (name !== "home") hideToast();
  document.querySelectorAll(".screen").forEach((el) => {
    el.hidden = el.dataset.screen !== name;
  });
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

function go(name) {
  if (location.hash === "#" + name) showScreen(name);
  else location.hash = name;
}

window.addEventListener("hashchange", () => showScreen(location.hash.slice(1)));

// 신호등 이름표
const SIGNALS = {
  green: {
    label: "초록불",
    title: "바로 안내해도 좋아요",
    desc: "근거·최신 여부·선례를 모두 확인했어요. 자신 있게 안내하세요.",
  },
  yellow: {
    label: "노란불",
    title: "선배에게 한 번 확인해요",
    desc: "확인하지 못한 항목이 하나 있어요. 안내 전에 선배에게 짧게 확인받으세요.",
  },
  red: {
    label: "빨간불",
    title: "법령·법제처를 먼저 확인해요",
    desc: "확인하지 못한 항목이 많아요. 바로 안내하지 말고 법령과 공식 해석을 먼저 찾아보세요.",
  },
};

// 신호등 색과 문구를 함께 바꿔요
function renderSignal(signal) {
  const s = SIGNALS[signal];
  document.getElementById("signal-panel").dataset.signal = signal;
  document.getElementById("signal-badge").textContent = s.label;
  document.getElementById("result-title").textContent = s.title;
  document.getElementById("signal-desc").textContent = s.desc;
}

function typeName(id) {
  const t = TYPES.find((x) => x.id === id);
  return t ? t.name : "기타";
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

// 2단계: 샘플 데이터로 홈 화면 채우기
function renderTypes() {
  const list = document.getElementById("type-list");
  list.innerHTML = "";
  TYPES.forEach((t) => {
    const a = document.createElement("a");
    a.className = "card type-card";
    a.href = "#write";
    a.dataset.new = "";
    a.dataset.type = t.id;
    a.innerHTML = `
      <span class="type-mark" aria-hidden="true"></span>
      <span class="type-name"></span>
      <span class="type-desc"></span>`;
    a.querySelector(".type-mark").textContent = t.mark;
    a.querySelector(".type-name").textContent = t.name;
    a.querySelector(".type-desc").textContent = t.desc;
    list.appendChild(a);
  });

  const select = document.getElementById("f-type");
  TYPES.forEach((t) => select.add(new Option(t.name, t.id)));
}

function renderRecords(records) {
  const list = document.getElementById("record-list");
  list.innerHTML = "";
  document.getElementById("record-empty").hidden = records.length > 0;

  // 날짜가 같으면 나중에 저장한 기록이 위로
  [...records]
    .sort((a, b) => b.date.localeCompare(a.date) || (b.savedAt || 0) - (a.savedAt || 0))
    .forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <button type="button" class="card record-row">
          <span class="record-dot" aria-hidden="true"></span>
          <span class="record-body">
            <span class="record-meta">
              <span class="record-signal"></span>
              <span class="record-type"></span>
              <time class="record-date"></time>
              <span class="record-person"></span>
            </span>
            <span class="record-content"></span>
          </span>
          <span class="record-arrow" aria-hidden="true">›</span>
        </button>`;
      const btn = li.querySelector("button");
      btn.dataset.signal = r.signal;
      btn.dataset.id = r.id;
      li.querySelector(".record-signal").textContent = SIGNALS[r.signal].label;
      li.querySelector(".record-type").textContent = typeName(r.type);
      li.querySelector(".record-date").textContent = formatDate(r.date);
      li.querySelector(".record-date").dateTime = r.date;
      li.querySelector(".record-person").textContent = maskName(r.name);
      li.querySelector(".record-content").textContent = r.content;
      list.appendChild(li);
    });
}

// 5단계: 브라우저에 저장 (새로고침해도 남아요)
const STORAGE_KEY = "signal-records-v1";

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // 처음 열었을 때는 샘플 기록 3개로 시작해요
      const seed = SAMPLE_RECORDS.map((r) => ({ ...r }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return SAMPLE_RECORDS.map((r) => ({ ...r }));
  }
}

function saveRecords(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    return false;
  }
}

let records = loadRecords();
let viewing = null; // 목록에서 다시 보고 있는 기록

renderTypes();
renderRecords(records);

// 3단계: 기록 작성 → 자가 점검
let draft = null; // 지금 작성 중인 기록

const writeForm = document.getElementById("write-form");
const writeError = document.getElementById("write-error");
const checkForm = document.getElementById("check-form");
const checkSubmit = document.getElementById("check-submit");
const checkStatus = document.getElementById("check-status");

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 새 기록 시작: 칸을 비우고, 유형 카드로 왔으면 그 유형을 미리 골라 둠
function startNewRecord(typeId) {
  draft = null;
  writeForm.reset();
  checkForm.reset();
  clearErrors();
  writeForm.date.value = today();
  if (typeId) writeForm.type.value = typeId;
  updateCheckStatus();
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-new]");
  if (link) startNewRecord(link.dataset.type);
});

function clearErrors() {
  writeError.hidden = true;
  writeForm.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
}

writeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const f = writeForm;
  const missing = [];
  if (!f.date.value) missing.push([f.date, "날짜"]);
  if (!f.type.value) missing.push([f.type, "민원 유형"]);
  if (!f.content.value.trim()) missing.push([f.content, "민원 내용"]);

  const lawUrl = f.lawUrl.value.trim();
  const badUrl = lawUrl && !/^https?:\/\//.test(lawUrl);

  if (missing.length || badUrl) {
    const msgs = [];
    if (missing.length) msgs.push(`필수 칸을 채워 주세요: ${missing.map((m) => m[1]).join(", ")}`);
    if (badUrl) msgs.push("법령 링크는 https:// 로 시작하는 주소를 붙여 넣어 주세요.");
    writeError.textContent = msgs.join(" ");
    writeError.hidden = false;
    const fields = missing.map((m) => m[0]);
    if (badUrl) fields.push(f.lawUrl);
    fields.forEach((el) => el.setAttribute("aria-invalid", "true"));
    fields[0].focus();
    return;
  }

  draft = {
    date: f.date.value,
    type: f.type.value,
    name: f.name.value.trim(),
    phone: f.phone.value.trim(),
    address: f.address.value.trim(),
    content: f.content.value.trim(),
    lawName: f.lawName.value.trim(),
    lawUrl,
  };
  go("check");
});

// 3문항에 모두 답해야 결과 보기를 누를 수 있어요
function getAnswers() {
  const a = {};
  ["q1", "q2", "q3"].forEach((q) => {
    const checked = checkForm.querySelector(`input[name="${q}"]:checked`);
    a[q] = checked ? checked.value : null;
  });
  return a;
}

function updateCheckStatus() {
  const answered = Object.values(getAnswers()).filter(Boolean).length;
  checkSubmit.disabled = answered < 3;
  checkStatus.textContent = answered < 3 ? `${answered} / 3 답했어요` : "모두 답했어요";
}

checkForm.addEventListener("change", updateCheckStatus);

// "예" 개수 → 3개 초록 / 2개 노랑 / 1개 이하 빨강
function decideSignal(answers) {
  const yes = Object.values(answers).filter((v) => v === "yes").length;
  if (yes === 3) return "green";
  if (yes === 2) return "yellow";
  return "red";
}

checkForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const answers = getAnswers();
  if (Object.values(answers).some((v) => !v)) return;
  draft.answers = answers;
  draft.signal = decideSignal(answers);
  renderResult(draft);
  go("result");
});

// 4단계: 결과 화면 — 다음 행동 + 기록 요약
const QUESTIONS = {
  q1: { short: "근거 규정", ask: "근거가 되는 규정이나 안내문이 무엇인지" },
  q2: { short: "최신 여부", ask: "지금 가진 자료가 최신(시행일·수정일)인지" },
  q3: { short: "선례 확인", ask: "비슷하게 처리한 선례가 있는지" },
};
const OFFICIAL_LINKS = [
  { name: "국가법령정보센터에서 법령 찾기", url: "https://www.law.go.kr" },
  { name: "법제처에서 법령 해석 알아보기", url: "https://www.moleg.go.kr" },
];

// 개인정보 가리기: 홍길동 → 홍*동, 010-1234-5678 → 010-****-5678, 주소는 앞 두 단어만
function maskName(s) {
  if (!s) return "";
  if (s.length <= 1) return "*";
  if (s.length === 2) return s[0] + "*";
  return s[0] + "*".repeat(s.length - 2) + s[s.length - 1];
}
function maskPhone(s) {
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
function maskAddress(s) {
  if (!s) return "";
  const parts = s.split(/\s+/);
  return parts.length <= 2 ? parts.join(" ") + " ***" : parts.slice(0, 2).join(" ") + " ***";
}

function el(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}
function linkItem(name, url) {
  const li = el("li");
  li.appendChild(el("a", name + " ↗", { href: url, target: "_blank", rel: "noopener" }));
  return li;
}

function renderNextActions(r) {
  const list = document.getElementById("next-list");
  list.innerHTML = "";
  const missed = Object.keys(QUESTIONS).filter((q) => r.answers[q] !== "yes");
  const tName = typeName(r.type);

  if (r.signal === "green") {
    list.appendChild(el("li", "민원인에게 확인한 내용대로 안내하세요."));
    list.appendChild(el("li", "안내한 뒤 기록을 저장해 두면 다음에 같은 민원이 왔을 때 바로 다시 볼 수 있어요."));
  } else if (r.signal === "yellow") {
    const q = QUESTIONS[missed[0]];
    list.appendChild(el("li", `확인하지 못한 항목: ${q.short}`));
    const tip = el("li", "선배에게 이렇게 물어보세요: ");
    tip.appendChild(el("q", `${tName} 민원인데, ${q.ask} 한 번 확인 부탁드려요.`));
    list.appendChild(tip);
    list.appendChild(el("li", "확인받은 내용은 기록에 남겨 두세요. 다음엔 혼자서도 초록불이 될 수 있어요."));
  } else {
    list.appendChild(el("li", `확인하지 못한 항목: ${missed.map((q) => QUESTIONS[q].short).join(", ")}`));
    list.appendChild(el("li", "민원인에게는 \"정확히 확인한 뒤 다시 안내드리겠습니다\"라고 말하고, 아래에서 법령과 공식 해석을 먼저 찾아보세요."));
    OFFICIAL_LINKS.forEach((l) => list.appendChild(linkItem(l.name, l.url)));
  }
  if (r.lawUrl) list.appendChild(linkItem(`기록한 관련 법령 열기: ${r.lawName || "링크"}`, r.lawUrl));
}

function renderSummary(r) {
  const dl = document.getElementById("summary");
  dl.innerHTML = "";
  const add = (label, value) => {
    dl.appendChild(el("dt", label));
    const dd = el("dd");
    if (value instanceof Node) dd.appendChild(value);
    else dd.textContent = value || "—";
    dl.appendChild(dd);
  };
  add("날짜", formatDate(r.date));
  add("민원 유형", typeName(r.type));
  add("민원인", [maskName(r.name), maskPhone(r.phone), maskAddress(r.address)].filter(Boolean).join(" · "));
  add("민원 내용", r.content);
  add("관련 법령", r.lawUrl ? el("a", (r.lawName || r.lawUrl) + " ↗", { href: r.lawUrl, target: "_blank", rel: "noopener" }) : r.lawName);
  add("점검", Object.keys(QUESTIONS).map((q) => `${QUESTIONS[q].short} ${r.answers[q] === "yes" ? "예" : "아니오"}`).join(" · "));
}

function renderResult(r) {
  renderSignal(r.signal);
  renderNextActions(r);
  renderSummary(r);
}

// 저장하기
const saveBtn = document.getElementById("save-btn");
const saveError = document.getElementById("save-error");
const toast = document.getElementById("save-toast");
let toastTimer = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}
function hideToast() {
  toast.hidden = true;
}

saveBtn.addEventListener("click", () => {
  if (!draft || !draft.signal) return;
  const record = { ...draft, id: "r-" + Date.now(), savedAt: Date.now() };
  const next = [...records, record];
  if (!saveRecords(next)) {
    saveError.textContent = "저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 저장이 막혀 있을 수 있어요. 시크릿 창이라면 일반 창에서 다시 해 보세요.";
    saveError.hidden = false;
    return;
  }
  records = next;
  renderRecords(records);
  startNewRecord();
  go("home");
  showToast(`저장했어요 · ${SIGNALS[record.signal].label} · ${typeName(record.type)}`);
  // 화면 전환이 끝난 뒤 목록 쪽으로 내려가요
  setTimeout(() => document.getElementById("records-title").scrollIntoView({ block: "start" }), 50);
});

// 목록에서 기록을 누르면 결과 화면으로 다시 보기
function setViewing(record) {
  viewing = record;
  const isView = Boolean(record);
  document.getElementById("result-label").textContent = isView ? "저장된 기록" : "3 / 3 · 점검 결과";
  document.getElementById("recheck-link").hidden = isView;
  saveBtn.hidden = isView;
  document.getElementById("back-home").hidden = !isView;
  saveError.hidden = true;
  if (isView) renderResult(record);
  else if (draft && draft.signal) renderResult(draft);
}

document.getElementById("record-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".record-row");
  if (!btn) return;
  const record = records.find((r) => r.id === btn.dataset.id);
  if (!record) return;
  setViewing(record);
  go("result");
});

startNewRecord();

showScreen(location.hash.slice(1));
