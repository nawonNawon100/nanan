// 할 일 목록 — 추가·완료 체크·삭제, localStorage에 저장

const TODO_KEY = 'todo-list';   // localStorage에 저장할 때 쓰는 이름

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const listEl = document.getElementById('todo-list');
const countEl = document.getElementById('todo-count');
const msgEl = document.getElementById('todo-msg');

// 1. 저장된 할 일 읽기 / 저장하기 (저장소를 못 쓰는 환경도 대비)
function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODO_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveTodos() {
  try {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
    msgEl.textContent = '';
  } catch (e) {
    msgEl.textContent = '할 일을 저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있어요.';
  }
}

let todos = loadTodos();

// 2. 목록 그리기
function render() {
  listEl.replaceChildren();

  if (todos.length === 0) {
    const li = document.createElement('li');
    li.className = 'todo-empty';
    li.textContent = '아직 할 일이 없어요. 위에 입력하고 [추가]를 눌러 보세요.';
    listEl.appendChild(li);
  }

  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' done' : '');

    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = todo.done;
    check.addEventListener('change', () => {
      todo.done = check.checked;
      saveTodos();
      render();
    });
    const text = document.createElement('span');
    text.textContent = todo.text;   // textContent로 넣어 HTML 삽입 방지
    label.append(check, text);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-delete';
    del.textContent = '삭제';
    del.setAttribute('aria-label', `"${todo.text}" 삭제`);
    del.addEventListener('click', () => {
      todos = todos.filter((t) => t.id !== todo.id);
      saveTodos();
      render();
    });

    li.append(label, del);
    listEl.appendChild(li);
  });

  const left = todos.filter((t) => !t.done).length;
  countEl.textContent = `남은 일 ${left}개 / 전체 ${todos.length}개`;
}

// 3. 할 일 추가 (Enter 또는 [추가] 버튼)
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    msgEl.textContent = '할 일을 입력해 주세요.';
    input.focus();
    return;
  }
  todos.push({ id: Date.now(), text, done: false });
  input.value = '';
  saveTodos();
  render();
  input.focus();
});

render();
