import { useEffect, useState } from 'react'
import { QUESTIONS, OPTIONS, getLevel } from './questions.js'
import Experience, { Hotlines } from './experience/Experience.jsx'
import HomeScreen from './HomeScreen.jsx'

function CheckScreen({ goHelp }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null))
  const [result, setResult] = useState(null)
  const [warning, setWarning] = useState('')

  function choose(qi, score) {
    setAnswers((cur) => cur.map((v, i) => (i === qi ? score : v)))
    setResult(null)
  }

  function showResult() {
    const left = answers.filter((v) => v === null).length
    if (left > 0) {
      setWarning(`아직 답하지 않은 문항이 ${left}개 있습니다.`)
      return
    }
    setWarning('')
    const total = answers.reduce((a, b) => a + b, 0)
    setResult({ total, ...getLevel(total) })
  }

  function reset() {
    setAnswers(Array(QUESTIONS.length).fill(null))
    setResult(null)
    setWarning('')
  }

  return (
    <section className="page" aria-labelledby="check-title">
      <header className="page-head">
        <p className="eyebrow">도박을 해 본 적이 있다면</p>
        <h2 id="check-title">자가진단 9문항</h2>
        <p className="lead">지난 12개월을 떠올리며 답해 주세요. 결과는 저장되지 않고, 참고용입니다.</p>
      </header>

      <ol className="questions">
        {QUESTIONS.map((q, qi) => (
          <li key={qi} className="question">
            <p className="q-text">{q}</p>
            <div className="options" role="radiogroup" aria-label={`${qi + 1}번 문항`}>
              {OPTIONS.map((o) => (
                <button
                  key={o.score}
                  type="button"
                  role="radio"
                  aria-checked={answers[qi] === o.score}
                  className={`chip ${answers[qi] === o.score ? 'is-on' : ''}`}
                  onClick={() => choose(qi, o.score)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {warning && <p className="notice" role="alert">{warning}</p>}
      <button type="button" className="btn btn-primary btn-wide" onClick={showResult}>결과 보기</button>

      {result && (
        <div className={`card result result-${result.key}`} aria-live="polite">
          <p className="result-label">위험 수준 · 참고용</p>
          <p className="result-level">{result.name}</p>
          <p className="result-score">점수 {result.total} / {QUESTIONS.length * 3}</p>
          <p>{result.next}</p>
          <Hotlines />
          <div className="row">
            <button type="button" className="btn" onClick={goHelp}>도움 받는 방법 보기</button>
            <button type="button" className="btn btn-quiet" onClick={reset}>다시 하기</button>
          </div>
        </div>
      )}
    </section>
  )
}

function HelpScreen() {
  return (
    <section className="page" aria-labelledby="help-title">
      <header className="page-head">
        <p className="eyebrow">혼자 고민하지 않아도 돼요</p>
        <h2 id="help-title">상담 전화와 도움 받는 곳</h2>
        <p className="lead">나 또는 친구가 도박 때문에 힘들다면 지금 바로 전화할 수 있어요. 무료이고, 이름을 말하지 않아도 됩니다.</p>
      </header>

      <Hotlines />

      <div className="card">
        <h3>상담 기관</h3>
        <a className="link-row" href="https://www.kcgp.or.kr" target="_blank" rel="noreferrer">
          한국도박문제예방치유원 <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="card">
        <h3>지금 할 수 있는 일</h3>
        <ol className="steps">
          <li>도박 광고 문자·메시지를 보낸 번호와 계정을 차단해요.</li>
          <li>친구가 권하면 "그거 운영자가 결과 정하는 거야. 나는 안 해."라고 말해요.</li>
          <li>믿을 수 있는 어른(부모님, 선생님, 상담 선생님)에게 오늘 이야기해요.</li>
        </ol>
      </div>
      <p className="muted small">생명이 위급하면 119, 자살 예방 상담은 109로 연락하세요.</p>
    </section>
  )
}

const TABS = [
  { id: 'home', label: '소개' },
  { id: 'exp', label: '체험하기' },
  { id: 'check', label: '자가진단' },
  { id: 'help', label: '상담' },
]
const labelOf = (id) => ({ exp: '체험하기', check: '자가진단', help: '상담·도움' })[id]

// 하위 화면 위의 띠: 위치와 화면 이름
function SubBand({ tab, go }) {
  return (
    <div className="subband">
      <div className="wrap subband-in">
        <nav className="crumb" aria-label="현재 위치">
          <button type="button" onClick={() => go('home')}>프로그램 소개</button>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{labelOf(tab)}</span>
        </nav>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <div className="app">
      <a className="skip" href="#main">본문 바로가기</a>

      <header className="top">
        <div className="wrap top-in">
          <button type="button" className="brand" onClick={() => setTab('home')}>
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-name">몸소 깨닫는 불법도박의 실체</span>
              <span className="brand-sub">중·고등학생 불법도박 예방교육 프로그램</span>
            </span>
          </button>
          <a className="top-call" href="tel:1336">상담 <b>1336</b></a>
          <nav className="gnb" aria-label="주 메뉴">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`gnb-item ${tab === t.id ? 'is-on' : ''}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {tab === 'home' && <HomeScreen go={setTab} />}
        {tab !== 'home' && (
          <>
            <SubBand tab={tab} go={setTab} />
            <div className="content wrap">
              {tab === 'exp' && <Experience goHelp={() => setTab('help')} goHome={() => setTab('home')} />}
              {tab === 'check' && <CheckScreen goHelp={() => setTab('help')} />}
              {tab === 'help' && <HelpScreen />}
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <p className="foot-name">몸소 깨닫는 불법도박의 실체 · 중·고등학생 불법도박 예방교육 프로그램</p>
          <p>모든 체험은 가상 머니로만 진행되며, 실제 돈·계좌·개인정보를 받지 않습니다. 체험 기록은 저장하지 않아 새로고침하면 처음부터 시작합니다.</p>
          <p className="foot-tel">
            <a href="tel:1336">도박문제 헬프라인 1336 (24시간·무료)</a>
            <a href="tel:1388">청소년 상담 1388 (24시간)</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
