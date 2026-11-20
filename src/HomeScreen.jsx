import { useEffect, useRef } from 'react'

// 첫 화면: 교육청·학교에 내는 "프로그램 소개서" 한 장.
// 무엇을(목표) · 어떻게(순서) · 얼마나 안전하게(운영 원칙) 하는지를 한 화면에서 보여 주고,
// 학생은 소개를 끝까지 내려 읽은 뒤, 맨 아래 큰 시작 버튼으로 들어간다.

const FACTS = [
  ['대상', '중·고등학생'],
  ['운영', '한 차시 45분 · 학급 단위'],
  ['형태', '체험형 시뮬레이션 + 활동지'],
  ['준비물', '1인 1기기 (설치·로그인 없음)'],
]

const STEPS = [
  { no: 1, name: '체험', time: '10분', text: '불법 도박 사이트를 재현한 화면에서 가상 머니로 게임을 해요.' },
  { no: 2, name: '수법 찾기', time: '5분', text: '체험 중에 수상했던 장면을 직접 골라요.' },
  { no: 3, name: '정답 공개', time: '10분', text: '판마다 숨은 수법과 돈을 받을 수 없는 이유를 확인해요.' },
  { no: 4, name: '마무리', time: '15분', text: '거절하는 말을 연습하고, 나의 활동 결과를 정리해요.' },
]

const GOALS = [
  { verb: '안다', text: '불법 도박 사이트는 이기고 지는 결과를 운영자가 정한다는 것을 안다.' },
  { verb: '찾는다', text: '돈을 따도 받을 수 없게 만드는 수법을 체험 속에서 찾아낸다.' },
  { verb: '실천한다', text: '권유를 받았을 때 거절하고, 필요하면 도움을 요청한다.' },
]

// 사행성 조장 우려에 대한 운영 원칙 (교육청 검토 항목)
const SAFEGUARDS = [
  { title: '실제 돈·개인정보를 쓰지 않아요', text: '모든 금액은 가상 머니입니다. 가입 화면의 이름·계좌·신분증 칸은 입력되지 않게 막혀 있어요.' },
  { title: '기록을 남기지 않아요', text: '서버·로그인이 없어요. 진행 상황은 새로고침해도 이어지지만, 브라우저 탭을 닫으면 모두 지워져요.' },
  { title: '반드시 정답을 공개해요', text: '체험이 끝나면 어떤 경우든 수법 공개와 상담 안내로 이어져요. 체험만 하고 끝나지 않아요.' },
  { title: '반복할 이유를 만들지 않아요', text: '점수·순위·보상·칩 이월이 없어요. 누구나 같은 결과(받은 돈 0원)로 끝나요.' },
  { title: '실제 사이트를 흉내 내지 않아요', text: '실제 사이트 이름·로고·배당률은 쓰지 않았고, 체험 중에는 "교육용 체험 · 실제 돈 아님"이 늘 보여요.' },
  { title: '도움이 먼저인 학생을 챙겨요', text: '도박을 해 본 학생에게는 체험보다 자가진단과 상담(1336·1388)을 먼저 안내해요.' },
]

const SUBJECTS = ['보건 · 중독 예방', '도덕 · 절제와 자기 통제', '정보 · 디지털 윤리', '창의적 체험활동 · 안전교육']

export default function HomeScreen({ go, introRead, onRead, gate }) {
  const endRef = useRef(null)
  const startRef = useRef(null)

  // 맨 아래(시작 영역)가 화면에 들어오면 "끝까지 읽음"으로 본다
  useEffect(() => {
    if (introRead || !endRef.current) return undefined
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) onRead() }, { threshold: 0.6 })
    io.observe(endRef.current)
    return () => io.disconnect()
  }, [introRead, onRead])

  // 메뉴의 "체험하기"를 누르면 맨 아래 체험하기 버튼 위치로 내려간다.
  // (화면 전환 때 맨 위로 올리는 동작이 먼저 끝나도록 한 박자 뒤에 내린다)
  useEffect(() => {
    if (!gate || !startRef.current) return undefined
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => startRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }), 50)
    return () => clearTimeout(t)
  }, [gate])

  return (
    <div className="home">
      <section className="hero-band" aria-labelledby="home-title">
        <div className="wrap hero">
          <div className="hero-main">
            <p className="hero-eyebrow">중·고등학생 불법도박 예방교육 프로그램</p>
            <h2 id="home-title">불법 도박은 처음부터 이길 수 없게 짜여 있습니다</h2>
            <p className="hero-lead">학생이 직접 겪어 보고, 왜 돈을 받을 수 없는지 스스로 찾아내는 체험형 예방교육입니다.</p>
            <p className="scroll-cue" aria-hidden={introRead}>
              <span>{introRead ? '소개를 다 읽었어요. 맨 아래에서 체험을 시작하세요.' : '아래로 내려 소개를 끝까지 읽으면 체험을 시작할 수 있어요'}</span>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
            </p>
          </div>
          <dl className="hero-facts" aria-label="프로그램 개요">
            {FACTS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="wrap home-sec" aria-labelledby="goals-title">
        <div className="sec-head">
          <p className="sec-no">01</p>
          <h3 id="goals-title" className="section-title">학습 목표</h3>
        </div>
        <ol className="goals">
          {GOALS.map((g) => <li key={g.verb}><b>{g.verb}</b><span>{g.text}</span></li>)}
        </ol>
      </section>

      <section className="wrap home-sec" aria-labelledby="steps-title">
        <div className="sec-head">
          <p className="sec-no">02</p>
          <h3 id="steps-title" className="section-title">수업 흐름 <small>45분 · 도입 5분 포함</small></h3>
        </div>
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

      <section className="safe-band" aria-labelledby="safe-title">
        <div className="wrap home-sec">
          <div className="sec-head">
            <p className="sec-no">03</p>
            <h3 id="safe-title" className="section-title">안전하게 운영하기 위한 원칙</h3>
          </div>
          <p className="sec-lead">도박 장면을 다루는 수업인 만큼, 오히려 흥미를 키우지 않도록 아래 원칙을 화면에 직접 넣었습니다.</p>
          <ul className="safeguards">
            {SAFEGUARDS.map((g, i) => (
              <li key={g.title}>
                <span className="safe-no">{i + 1}</span>
                <b>{g.title}</b>
                <p>{g.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap home-sec home-two" aria-label="연계 교과와 상담">
        <div>
          <div className="sec-head">
            <p className="sec-no">04</p>
            <h3 className="section-title">연계할 수 있는 교과 <small>예시</small></h3>
          </div>
          <ul className="subjects">{SUBJECTS.map((x) => <li key={x}>{x}</li>)}</ul>
          <button type="button" className="link-tile" onClick={() => go('check')}>
            <b>자가진단 9문항</b>
            <span>도박을 해 본 적이 있는 학생은 체험 전에 먼저 점검해요</span>
          </button>
        </div>
        <div>
          <div className="sec-head">
            <p className="sec-no">05</p>
            <h3 className="section-title">상담 연계</h3>
          </div>
          <a className="call-row" href="tel:1336"><span>도박문제 헬프라인<small>24시간 · 무료 · 익명 상담</small></span><b>1336</b></a>
          <a className="call-row" href="tel:1388"><span>청소년 상담<small>24시간 · 전화·문자·채팅</small></span><b>1388</b></a>
        </div>
      </section>

      <section className="start-band" aria-labelledby="start-title" ref={endRef}>
        <div className="wrap start-in">
          <div className="sec-head">
            <p className="sec-no">06</p>
            <h3 id="start-title" className="section-title">체험 시작</h3>
          </div>
          <p className="sec-lead">소개를 모두 읽었다면 시작해 볼까요? 체험이 끝나면 정답 공개와 마무리 활동까지 이어져요.</p>
          <button type="button" className="start-card" ref={startRef} onClick={() => go('exp')}>
            <span className="start-text">
              <span className="start-label">학생용 · 지금 시작하기</span>
              <span className="start-title">체험하기</span>
              <span className="start-sub">가상 머니 100,000원 · 게임 4종 · 약 10분</span>
            </span>
            <span className="start-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}
