import { useEffect, useMemo, useState } from 'react'
import { QUESTIONS, OPTIONS, getLevel } from './questions.js'

const STORAGE_KEY = 'stopnote.records'
const HELPLINE = '1336'

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`

function HelpButton() {
  return (
    <a className="btn btn-primary" href={`tel:${HELPLINE}`}>
      {HELPLINE}에 전화하기
    </a>
  )
}

function CheckScreen({ goRecords }) {
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
    <section aria-labelledby="check-title">
      <h2 id="check-title">자가진단</h2>
      <p className="lead">지난 12개월을 떠올리며 답해 주세요. 결과는 저장되지 않습니다.</p>

      <ol className="questions">
        {QUESTIONS.map((q, qi) => (
          <li key={qi} className="card">
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
      <button type="button" className="btn btn-primary btn-wide" onClick={showResult}>
        결과 보기
      </button>

      {result && (
        <div className={`card result result-${result.key}`} aria-live="polite">
          <p className="result-label">위험 수준 · 참고용</p>
          <p className="result-level">{result.name}</p>
          <p className="result-score">점수 {result.total} / {QUESTIONS.length * 3}</p>
          <p>{result.next}</p>
          <div className="row">
            <HelpButton />
            <button type="button" className="btn" onClick={goRecords}>기록하러 가기</button>
          </div>
          <button type="button" className="link" onClick={reset}>다시 하기</button>
        </div>
      )}
    </section>
  )
}

function RecordsScreen() {
  const [records, setRecords] = useState(loadRecords)
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('urge')
  const [memo, setMemo] = useState('')
  const [message, setMessage] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch {
      setMessage('이 브라우저에서는 기록을 저장할 수 없습니다. 시크릿 모드인지 확인해 주세요.')
    }
  }, [records])

  const monthRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(today().slice(0, 7))),
    [records],
  )
  const monthTotal = monthRecords.reduce((sum, r) => sum + r.amount, 0)
  const urgeCount = monthRecords.filter((r) => r.type === 'urge').length

  function addRecord(e) {
    e.preventDefault()
    if (amount === '' || Number(amount) < 0) {
      setMessage('금액을 입력해 주세요. 베팅하지 않고 참았다면 0을 입력하세요.')
      return
    }
    const record = {
      id: crypto.randomUUID(),
      date,
      amount: Number(amount),
      type,
      memo: memo.trim(),
    }
    setRecords((cur) => [record, ...cur])
    setAmount('')
    setMemo('')
    setMessage(type === 'urge' ? '참아 낸 기록을 남겼습니다.' : '기록을 추가했습니다.')
  }

  function deleteRecord(id) {
    setRecords((cur) => cur.filter((r) => r.id !== id))
    setPendingDelete(null)
    setMessage('기록을 삭제했습니다.')
  }

  return (
    <section aria-labelledby="records-title">
      <h2 id="records-title">충동·지출 기록</h2>

      <div className="stats">
        <div className="card stat">
          <p className="stat-label">이번 달 지출</p>
          <p className="stat-value">{won(monthTotal)}</p>
        </div>
        <div className="card stat">
          <p className="stat-label">이번 달 참아 낸 횟수</p>
          <p className="stat-value">{urgeCount}회</p>
        </div>
      </div>

      <form className="card form" onSubmit={addRecord} noValidate>
        <label>
          날짜
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <fieldset>
          <legend>상황</legend>
          <div className="options">
            <button type="button" className={`chip ${type === 'urge' ? 'is-on' : ''}`} aria-pressed={type === 'urge'} onClick={() => setType('urge')}>
              충동만 (참음)
            </button>
            <button type="button" className={`chip ${type === 'bet' ? 'is-on' : ''}`} aria-pressed={type === 'bet'} onClick={() => setType('bet')}>
              실제 베팅
            </button>
          </div>
        </fieldset>
        <label>
          금액 (원)
          <input type="number" inputMode="numeric" min="0" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          메모
          <input type="text" value={memo} maxLength={80} placeholder="예: 새벽 광고 문자 보고 접속" onChange={(e) => setMemo(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-wide">기록 추가</button>
      </form>

      {message && <p className="notice" role="status">{message}</p>}

      <h3 className="list-title">전체 기록 {records.length}건</h3>
      {records.length === 0 ? (
        <p className="muted">아직 기록이 없습니다. 첫 기록을 남겨 보세요.</p>
      ) : (
        <ul className="records">
          {records.map((r) => (
            <li key={r.id} className="card record">
              <div className="record-main">
                <p className="record-top">
                  <span className={`tag tag-${r.type}`}>{r.type === 'urge' ? '충동만' : '실제 베팅'}</span>
                  <span className="muted">{r.date}</span>
                </p>
                <p className="record-amount">{won(r.amount)}</p>
                {r.memo && <p className="muted">{r.memo}</p>}
              </div>
              <div className="record-actions">
                {pendingDelete === r.id ? (
                  <>
                    <button type="button" className="btn btn-danger" onClick={() => deleteRecord(r.id)}>정말 삭제</button>
                    <button type="button" className="btn" onClick={() => setPendingDelete(null)}>취소</button>
                  </>
                ) : (
                  <button type="button" className="btn" onClick={() => setPendingDelete(r.id)}>삭제</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HelpScreen() {
  return (
    <section aria-labelledby="help-title">
      <h2 id="help-title">도움 받기</h2>
      <div className="card help-call">
        <p className="lead">지금 힘들다면 혼자 버티지 않아도 됩니다.</p>
        <p className="help-number">{HELPLINE}</p>
        <p className="muted">도박문제 헬프라인 · 24시간 무료 상담</p>
        <HelpButton />
      </div>

      <div className="card">
        <h3>상담 기관</h3>
        <a className="link-row" href="https://www.kcgp.or.kr" target="_blank" rel="noreferrer">
          한국도박문제예방치유원 <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="card">
        <h3>지금 할 수 있는 일</h3>
        <ol className="steps">
          <li>도박 앱과 북마크를 지우고, 광고 번호를 차단합니다.</li>
          <li>카드·계좌를 믿을 수 있는 사람에게 잠시 맡깁니다.</li>
          <li>오늘 한 사람에게 "요즘 도박이 걱정돼"라고 말해 봅니다.</li>
        </ol>
      </div>
      <p className="muted small">생명이 위급하면 119, 자살 예방 상담은 109로 연락하세요.</p>
    </section>
  )
}

const TABS = [
  { id: 'check', label: '진단' },
  { id: 'records', label: '기록' },
  { id: 'help', label: '도움' },
]

export default function App() {
  const [tab, setTab] = useState('check')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  return (
    <div className="app">
      <header className="top">
        <h1>멈춤 노트</h1>
        <button type="button" className="btn btn-small" onClick={() => setTab('help')}>
          도움
        </button>
      </header>

      <main className="content">
        {tab === 'check' && <CheckScreen goRecords={() => setTab('records')} />}
        {tab === 'records' && <RecordsScreen />}
        {tab === 'help' && <HelpScreen />}
      </main>

      <nav className="tabs" aria-label="화면 이동">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'is-on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
