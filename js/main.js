// 모든 페이지가 같이 쓰는 스크립트

// 1. 폰 화면에서 ☰ 버튼으로 메뉴 열고 닫기
const menuBtn = document.querySelector('.menu-btn');
const navList = document.querySelector('.nav-list');
if (menuBtn && navList) {
  menuBtn.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? '✕' : '☰';
  });
}

// 2. 스크롤하면 섹션이 아래에서 살짝 올라오며 나타나기
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('in'));
}
