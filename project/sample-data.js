// 적극행정 신호등 — 샘플 데이터
// 민원인 정보는 모두 누가 봐도 가짜인 연습용 값이에요.

const TYPES = [
  { id: "move-in", name: "전입신고", desc: "이사 후 주소 옮기기, 세대 구성 문의", mark: "전" },
  { id: "welfare", name: "복지 지원 신청", desc: "각종 지원금·바우처 신청 안내", mark: "복" },
  { id: "certificate", name: "증명서 발급", desc: "등·초본 등 증명서 발급 문의", mark: "증" },
  { id: "etc", name: "기타", desc: "위에 없는 그 밖의 민원", mark: "기" },
];

const SAMPLE_RECORDS = [
  {
    id: "sample-1",
    date: "2026-10-13",
    type: "move-in",
    name: "홍길동",
    phone: "010-0000-0000",
    address: "○○시 ○○동",
    content: "세대주 변경 없이 혼자 전입신고할 때 필요한 서류를 물어보심",
    lawName: "주민등록법",
    lawUrl: "https://www.law.go.kr/법령/주민등록법",
    answers: { q1: "yes", q2: "yes", q3: "yes" },
    signal: "green",
  },
  {
    id: "sample-2",
    date: "2026-10-14",
    type: "welfare",
    name: "성춘향",
    phone: "010-0000-0000",
    address: "○○시 ○○동",
    content: "지원금 신청 자격 중 소득 기준이 올해 바뀌었는지 물어보심",
    lawName: "국민기초생활 보장법",
    lawUrl: "https://www.law.go.kr/법령/국민기초생활보장법",
    answers: { q1: "yes", q2: "yes", q3: "no" },
    signal: "yellow",
  },
  {
    id: "sample-3",
    date: "2026-10-15",
    type: "certificate",
    name: "임꺽정",
    phone: "010-0000-0000",
    address: "○○시 ○○동",
    content: "가족이 위임장 없이 대신 증명서를 발급받을 수 있는지 물어보심",
    lawName: "",
    lawUrl: "",
    answers: { q1: "yes", q2: "no", q3: "no" },
    signal: "red",
  },
];
