// 첫 화면: 사이트 메인이 아니라 "교육 프로그램 소개" 한 장.
// 학생이 한 눈에 보고 바로 시작할 수 있게 큰 시작 버튼 하나와 순서 4단계만 둔다.

const STEPS = [
  { no: 1, name: '체험', time: '약 10분', text: '가짜 카지노에서 가상 머니로 룰렛·경마·슬롯머신 같은 게임을 해요.' },
  { no: 2, name: '수법 찾기', time: '약 5분', text: '이상했던 장면을 직접 골라요.' },
  { no: 3, name: '정답 공개', time: '약 10분', text: '내가 당한 수법과 돈을 못 받는 이유를 확인해요.' },
  { no: 4, name: '마무리', time: '약 15분', text: '거절하는 말을 연습하고 상담 전화를 알아 둬요.' },
]

const GOALS = [
  '불법 도박 사이트는 결과를 운영자가 정한다는 것을 안다.',
  '돈을 따도 받을 수 없게 만드는 수법을 찾아낼 수 있다.',
  '권유를 받았을 때 거절하고, 도움을 요청하는 방법을 안다.',
]

export default function HomeScreen({ go }) {
  return (
    <div className="home">
      <section className="hero-band" aria-labelledby="home-title">
        <div className="wrap hero">
          <p className="hero-eyebrow">중·고등학생 불법도박 예방교육 프로그램</p>
          <h2 id="home-title">불법 도박은 처음부터 이길 수 없게 짜여 있습니다</h2>
          <p className="hero-lead">직접 겪어 보고, 왜 돈을 받을 수 없는지 스스로 찾아내는 체험형 수업입니다.</p>
          <ul className="hero-meta" aria-label="프로그램 정보">
            <li><span>대상</span>중·고등학생</li>
            <li><span>시간</span>한 차시 45분</li>
            <li><span>준비물</span>1인 1기기</li>
            <li><span>비용</span>실제 돈 없음 · 가상 머니</li>
          </ul>

          <button type="button" className="start-card" onClick={() => go('exp')}>
            <span className="start-text">
              <span className="start-label">지금 시작하기</span>
              <span className="start-title">체험하기</span>
              <span className="start-sub">가상 머니 100,000원 · 게임 4종 · 약 10분</span>
            </span>
            <span className="start-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>
        </div>
      </section>

      <section className="wrap" aria-labelledby="steps-title">
        <h3 id="steps-title" className="section-title">프로그램 순서</h3>
        <ol className="program-steps">
          {STEPS.map((st) => (
            <li key={st.no} className="program-step">
              <span className="program-no">{st.no}</span>
              <b>{st.name}</b>
              <span className="program-time">{st.time}</span>
              <p>{st.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="wrap" aria-labelledby="goals-title">
        <h3 id="goals-title" className="section-title">이 프로그램에서 배우는 것</h3>
        <ol className="goals">
          {GOALS.map((g) => <li key={g}>{g}</li>)}
        </ol>
      </section>

      <section className="wrap home-links" aria-label="함께 쓰는 자료">
        <button type="button" className="link-tile" onClick={() => go('check')}>
          <b>자가진단</b>
          <span>도박을 해 본 적이 있다면 9문항으로 점검해요</span>
        </button>
        <a className="link-tile is-call" href="tel:1336">
          <b>상담 전화 1336 · 1388</b>
          <span>24시간 · 무료 · 이름 말하지 않아도 돼요</span>
        </a>
      </section>
    </div>
  )
}
