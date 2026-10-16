// 명언 위젯 — 작품 목록 페이지와 명언 작품 페이지가 같이 써요
// 무료 API: Advice Slip (https://api.adviceslip.com) — 키 없이 사용

const API_URL = 'https://api.adviceslip.com/advice';
const STORAGE_KEY = 'advice-history';   // localStorage에 저장할 때 쓰는 이름
const MAX_HISTORY = 10;                 // 최근 10개까지만 보관

// 1. 저장된 기록 읽기 / 저장하기 (저장소를 못 쓰는 환경도 대비)
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

// 2. 2026-10-14T10:56 → 10. 14. 19:56
function formatTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 3. 화면에 있는 위젯마다 기능 연결
document.querySelectorAll('[data-advice]').forEach((widget) => {
  const textEl = widget.querySelector('[data-advice-text]');
  const btn = widget.querySelector('[data-advice-btn]');
  const msgEl = widget.querySelector('[data-advice-msg]');
  const listEl = widget.querySelector('[data-advice-history]');
  const clearBtn = widget.querySelector('[data-advice-clear]');
  const limit = Number(widget.dataset.limit) || MAX_HISTORY;   // 목록에 보여줄 개수

  function renderHistory() {
    if (!listEl) return;
    const list = loadHistory().slice(0, limit);
    listEl.replaceChildren();
    if (list.length === 0) {
      const li = document.createElement('li');
      li.className = 'advice-empty';
      li.textContent = '아직 기록이 없어요. 버튼을 눌러 첫 조언을 받아 보세요.';
      listEl.appendChild(li);
      return;
    }
    list.forEach((item) => {
      const li = document.createElement('li');
      const time = document.createElement('time');
      time.dateTime = item.time;
      time.textContent = formatTime(item.time);
      const span = document.createElement('span');
      span.textContent = item.advice;   // textContent로 넣어 HTML 삽입 방지
      li.append(time, span);
      listEl.appendChild(li);
    });
  }

  function showAdvice(advice) {
    textEl.textContent = `"${advice}"`;
    textEl.classList.remove('is-empty');
  }

  async function getAdvice() {
    btn.disabled = true;
    btn.textContent = '불러오는 중…';
    msgEl.textContent = '';
    try {
      // 같은 조언이 반복되지 않게 매번 주소 끝에 시간을 붙여요
      const res = await fetch(`${API_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const advice = data.slip.advice;
      showAdvice(advice);

      const list = loadHistory();
      list.unshift({ id: data.slip.id, advice, time: new Date().toISOString() });
      if (!saveHistory(list.slice(0, MAX_HISTORY))) {
        msgEl.textContent = '기록을 저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있어요.';
      }
      renderHistory();
    } catch (e) {
      msgEl.textContent = '조언을 가져오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
    } finally {
      btn.disabled = false;
      btn.textContent = '새 조언 받기';
    }
  }

  btn.addEventListener('click', getAdvice);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('조언 기록을 모두 지울까요?')) return;
      saveHistory([]);
      renderHistory();
    });
  }

  // 다른 탭에서 기록이 바뀌면 이 화면도 새로 그려요
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) renderHistory(); });

  // 처음 열었을 때: 마지막 조언을 다시 보여주고 기록 목록 그리기
  const last = loadHistory()[0];
  if (last) showAdvice(last.advice);
  renderHistory();
});
