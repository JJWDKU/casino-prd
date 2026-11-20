import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ANSWERS, BEFORE_AFTER_QUESTION, HIGH_BETS, FEED, GAMES, ERROR_MS, INVITE_AFTER_ROUND, MAX_ROUNDS, PAYOUT, QUIZ,
  PROCESS_MS, START_MONEY, TRICKS, WITHDRAW_RULE, betsOf, gameById, phaseOf, winOf,
} from './scenario.js'
import { DiceGame, HorseGame, RouletteGame, SlotGame } from './Games.jsx'

// 체험 진행은 세션 저장소에만 둔다: 새로고침하면 이어지고, 탭을 닫으면 사라진다. 서버로 보내지 않는다.
const SESSION_KEY = 'silche.exp.v9'
const OLD_KEYS = ['silche.experience', 'silche.experience.v6', 'silche.experience.v7', 'silche.experience.v8']
const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`
const signedWon = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Number(Math.abs(n)).toLocaleString('ko-KR')}원`
const rateOf = (money) => ((money - START_MONEY) / START_MONEY) * 100

const fresh = () => ({
  stage: 'start', // start | signup | lobby | game | scam | quiz | reveal | wrap
  game: null,
  before: null,
  after: null,
  money: START_MONEY,
  round: 0,
  history: [], // { round, game, bet, win, money, near, phase }
  invite: null,
  withdrawTries: 0,
  nearMiss: null,
  timerSeen: false,
  scamAt: null,
  scamDone: false,
  spotted: null,
})

export function Hotlines() {
  return (
    <div className="hotlines">
      <a className="hotline" href="tel:1336">
        <span className="hotline-label">도박문제 헬프라인 · 24시간</span>
        <span className="hotline-num">1336</span>
      </a>
      <a className="hotline" href="tel:1388">
        <span className="hotline-label">청소년 상담 · 24시간</span>
        <span className="hotline-num">1388</span>
      </a>
    </div>
  )
}

function Question({ value, onChange }) {
  return (
    <fieldset className="card q">
      <legend className="q-legend">{BEFORE_AFTER_QUESTION}</legend>
      <div className="options" role="radiogroup">
        {ANSWERS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={value === a} className={`chip ${value === a ? 'is-on' : ''}`} onClick={() => onChange(a)}>
            {a}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/* ---------- 단계 표시 ---------- */

const STEPS = ['체험', '수법 찾기', '정답 공개', '마무리']
const stepIndex = (s) => ({ quiz: 1, reveal: 2, wrap: 3 })[s.stage] ?? 0

function Stepper({ s }) {
  const now = stepIndex(s)
  return (
    <ol className="stepper" aria-label={`교육 진행 ${now + 1}/${STEPS.length}단계: ${STEPS[now]}`}>
      {STEPS.map((name, i) => (
        <li key={name} className={`step ${i === now ? 'is-now' : i < now ? 'is-done' : ''}`} aria-current={i === now ? 'step' : undefined}>
          <span className="step-no">{i < now ? '✓' : i + 1}</span>
          <span className="step-name">{name}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------- 시작 ---------- */

function StartScreen({ begin, goHelp }) {
  const [before, setBefore] = useState(null)
  const [warn, setWarn] = useState('')
  function go() {
    if (!before) {
      setWarn('먼저 위 질문에 답해 주세요.')
      return
    }
    begin(before)
  }
  return (
    <section className="page" aria-labelledby="start-title">
      <header className="page-head">
        <p className="eyebrow">체험하기</p>
        <h2 id="start-title">불법 도박 사이트 재현 체험</h2>
        <p className="lead">가상 머니 100,000원으로 불법 도박 사이트를 재현한 화면을 겪어 봅니다. 실제 돈과 개인정보는 쓰지 않아요.</p>
      </header>

      <div className="card">
        <h3 className="card-title">이렇게 진행해요</h3>
        <ol className="howto">
          <li><b>체험</b><span>룰렛·주사위 홀짝·경마·슬롯머신 중에서 골라 게임을 해요. 이기면 건 돈의 2배를 받아요. 5판을 해야 출금할 수 있다고 해요.</span></li>
          <li><b>수법 찾기</b><span>체험 중에 수상했던 장면을 직접 골라요.</span></li>
          <li><b>정답 공개</b><span>내가 한 판마다 숨은 수법과, 왜 돈을 받을 수 없는지 확인해요.</span></li>
          <li><b>마무리</b><span>거절하는 말을 연습하고 상담 전화를 알아 둬요.</span></li>
        </ol>
      </div>

      <Question value={before} onChange={(a) => { setBefore(a); setWarn('') }} />
      {warn && <p className="notice" role="alert">{warn}</p>}
      <button type="button" className="btn btn-primary btn-wide" onClick={go}>체험 시작하기</button>
      <p className="aside">
        도박을 해 본 적이 있거나 지금 그만두려고 한다면 체험보다 상담이 먼저예요.{' '}
        <button type="button" className="inline-link" onClick={goHelp}>상담 전화 보기</button>
      </p>
    </section>
  )
}

/* ---------- 재현 화면 공통 ---------- */

function ReplicaLabel({ s }) {
  const r = s?.round ?? 0
  const text = !s || s.stage === 'signup' ? '가입 단계'
    : r < MAX_ROUNDS ? `진행 ${r} / ${MAX_ROUNDS}판` : `${r}판 진행 · 출금 가능`
  return (
    <div className="replica-label" role="note">
      <span className="replica-tag"><i aria-hidden="true" />교육용 체험 · 실제 돈 아님</span>
      <span className="replica-progress">{text}</span>
    </div>
  )
}

function GameIcon({ id }) {
  const art = {
    roulette: <><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="8" /><path d="M24 8v8M24 32v8M8 24h8M32 24h8M12.7 12.7l5.7 5.7M29.6 29.6l5.7 5.7M35.3 12.7l-5.7 5.7M18.4 29.6l-5.7 5.7" /><circle cx="24" cy="12" r="2.2" fill="currentColor" /></>,
    dice: <><rect x="6" y="12" width="18" height="18" rx="4" /><rect x="24" y="18" width="18" height="18" rx="4" /><circle cx="11" cy="17" r="1.6" fill="currentColor" /><circle cx="19" cy="25" r="1.6" fill="currentColor" /><circle cx="29" cy="23" r="1.6" fill="currentColor" /><circle cx="33" cy="27" r="1.6" fill="currentColor" /><circle cx="37" cy="31" r="1.6" fill="currentColor" /></>,
    horse: <><path d="M8 34c3-8 9-12 17-12h5l5-8 3 1-1 7c3 1 5 4 6 7l-3 1-3-3-2 2v9h-3v-8H22l-3 8h-3l1-9c-3 0-6 2-9 5z" /><path d="M4 42h40" /></>,
    slot: <><rect x="8" y="8" width="28" height="32" rx="4" /><path d="M8 18h28M8 30h28M17.3 18v12M26.6 18v12" /><path d="M36 16h4v10" /><circle cx="40" cy="12" r="2.5" /></>,
  }
  return (
    <svg className="rp-game-icon" viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art[id]}</svg>
  )
}

function SiteBar({ s }) {
  return (
    <div className="rp-bar">
      <p className="rp-brand">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 11H5z" /></svg>
        LUCKY ROYAL <span className="rp-brand-sub">CASINO</span>
      </p>
      <p className="rp-balance"><span>보유</span><b>{won(s.money)}</b></p>
    </div>
  )
}

function SignupScreen({ update }) {
  const [blocked, setBlocked] = useState(false)
  const block = (e) => { e.preventDefault(); setBlocked(true) }
  const fields = [
    ['su-name', '이름'],
    ['su-phone', '휴대폰 번호'],
    ['su-bank', '계좌번호 (출금용)'],
  ]
  return (
    <div className="rp-body">
      <p className="rp-logo"><span>LUCKY ROYAL <small>CASINO</small></span><span className="rp-tag">가짜 사이트</span></p>
      <p className="rp-suits" aria-hidden="true">♠ ♥ ♦ ♣</p>
      <p className="rp-headline">지금 가입하면 100,000원으로 바로 시작!</p>
      <div className="rp-form">
        {fields.map(([id, label]) => (
          <label key={id} htmlFor={id} className="rp-field">
            {label}
            <input id={id} type="text" value="" readOnly aria-readonly="true" placeholder="입력할 수 없음" onFocus={() => setBlocked(true)} onKeyDown={block} onPointerDown={() => setBlocked(true)} />
          </label>
        ))}
        <div className="rp-field">
          신분증 사진
          <button type="button" className="rp-upload" onClick={() => setBlocked(true)}>사진 올리기 (막힘)</button>
        </div>
      </div>
      {blocked && <p className="rp-note" role="status">체험에서는 아무것도 입력하지 않아요. 진짜 사이트라면 여기서 넘긴 정보가 다른 범죄에 쓰일 수 있어요.</p>}
      <button type="button" className="rp-btn rp-primary" onClick={() => update({ stage: 'lobby' })}>입력 없이 가입한 것으로 하기</button>
    </div>
  )
}

function Feed() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FEED.length), 2800)
    return () => clearInterval(t)
  }, [])
  return <p className="rp-feed" aria-live="off"><span className="rp-live">LIVE</span>{FEED[i]}</p>
}

// 주식 화면처럼: 보유 금액, 수익률(▲빨강 ▼파랑), 손익, 금액 흐름 선
function Spark({ history }) {
  const pts = [START_MONEY, ...history.map((h) => h.money)]
  if (pts.length < 2) return <div className="rp-spark is-empty" aria-hidden="true" />
  const max = Math.max(...pts, START_MONEY * 1.2)
  const min = Math.min(...pts, 0)
  const x = (i) => (i / (pts.length - 1)) * 120
  const y = (v) => 40 - ((v - min) / (max - min || 1)) * 36 - 2
  const up = pts[pts.length - 1] >= START_MONEY
  return (
    <svg className={`rp-spark ${up ? 'is-up' : 'is-down'}`} viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="120" y1={y(START_MONEY)} y2={y(START_MONEY)} className="rp-spark-base" />
      <polyline points={pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
    </svg>
  )
}

function Stats({ s, frozen }) {
  const rate = rateOf(s.money)
  const diff = s.money - START_MONEY
  const dir = diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''
  const left = Math.max(0, MAX_ROUNDS - s.round)
  return (
    <div className={`rp-stats ${frozen ? 'is-frozen' : ''}`}>
      <div className="rp-stats-top">
        <div className="rp-money">
          <span className="rp-money-label">보유 금액</span>
          <b className="rp-money-num">{won(s.money)}</b>
        </div>
        <Spark history={s.history} />
      </div>
      <div className={`rp-rate ${dir}`}>
        <b>{diff > 0 ? '▲' : diff < 0 ? '▼' : '–'} {rate > 0 ? '+' : ''}{rate.toFixed(2)}%</b>
        <span>{signedWon(diff)}</span>
        <small>시작 {won(START_MONEY)} 기준</small>
      </div>
      <div className="rp-progress" aria-label={`${s.round}판 진행, 출금까지 ${left}판 남음`}>
        <ol>
          {Array.from({ length: MAX_ROUNDS }, (_, i) => (
            <li key={i} className={i < s.round ? 'is-done' : i === s.round ? 'is-now' : ''}>{i + 1}</li>
          ))}
          {s.round > MAX_ROUNDS && <li className="is-extra">+{s.round - MAX_ROUNDS}</li>}
        </ol>
        <span>{left > 0 ? `출금까지 ${left}판 더` : '출금 가능'}</span>
      </div>
    </div>
  )
}

function InvitePopup({ update }) {
  return (
    <div className="rp-pop" role="dialog" aria-label="친구 초대">
      <p>친구 1명 초대하면 <b>30,000원</b></p>
      <p className="rp-small">내 초대 코드 <code>LUCKY-7Q2</code></p>
      <div className="rp-pair">
        <button type="button" className="rp-btn rp-primary" onClick={() => update({ invite: 'sent' })}>초대하기</button>
        <button type="button" className="rp-btn" onClick={() => update({ invite: 'declined' })}>초대하지 않기</button>
      </div>
      <p className="rp-small">체험이라 실제로는 아무에게도 보내지 않아요.</p>
    </div>
  )
}

function WithdrawPopup({ s, onClose }) {
  return (
    <div className="rp-pop rp-reject" role="alertdialog" aria-label="출금 불가">
      <p className="rp-big-red">출금 불가</p>
      <p className="rp-rule">{WITHDRAW_RULE}</p>
      <p className="rp-small">지금 {s.round}판 · 보유 {won(s.money)}</p>
      <button type="button" className="rp-btn" onClick={onClose}>돌아가기</button>
    </div>
  )
}

function useWithdraw(s, update) {
  const [open, setOpen] = useState(false)
  const start = () => {
    if (s.money <= 0) {
      update({ stage: 'broke' })
      return
    }
    if (s.round >= MAX_ROUNDS) {
      update({ stage: 'scam', scamAt: s.money })
      return
    }
    update((p) => ({ withdrawTries: p.withdrawTries + 1 }))
    setOpen(true)
  }
  return [open, start, () => setOpen(false)]
}

function WithdrawButton({ s, onClick }) {
  const ready = s.round >= MAX_ROUNDS && s.money > 0
  return (
    <button type="button" className={`rp-btn rp-out ${ready ? 'is-ready' : ''}`} onClick={onClick}>
      {ready ? `${won(s.money)} 출금하기` : '출금하기'}
    </button>
  )
}

function VipBanner() {
  return (
    <div className="rp-pop rp-event" role="status">
      <p className="rp-headline">VIP 테이블 오픈!</p>
      <p>이제부터 판돈이 커져요. 최소 베팅 <b>{won(HIGH_BETS[0])}</b> · 크게 걸고 크게 따세요!</p>
    </div>
  )
}

function EndBox({ onWithdraw }) {
  return (
    <div className="rp-pop rp-reject">
      <p className="rp-big-red">보유 금액 0원</p>
      <p>{won(START_MONEY)}으로 시작해서 모두 잃었어요. 그동안 딴 돈은 어디 있을까요?</p>
      <p className="rp-headline">아래 [출금하기]를 눌러 보세요.</p>
      <button type="button" className="rp-btn rp-out" onClick={onWithdraw}>출금하기</button>
    </div>
  )
}

// 5판이 지나면 판이 끝날 때마다 "지금 출금할 수 있어요" 알림을 띄운다
function WithdrawToast({ s, onWithdraw }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="rp-toast" role="alert">
      <p className="rp-toast-head">알림 · {s.round}판 끝</p>
      <p>지금 바로 출금할 수 있어요! 보유 <b>{won(s.money)}</b></p>
      <div className="rp-toast-row">
        <button type="button" className="rp-btn rp-out is-ready" onClick={onWithdraw}>{won(s.money)} 출금하기</button>
        <button type="button" className="rp-btn" onClick={() => setOpen(false)}>닫기</button>
      </div>
    </div>
  )
}

function LobbyScreen({ s, update }) {
  const [withdrawing, openWithdraw, closeWithdraw] = useWithdraw(s, update)
  const showInvite = s.invite === null && s.round >= INVITE_AFTER_ROUND
  const out = s.money <= 0
  return (
    <div className="rp-body">
      <SiteBar s={s} />
      <Stats s={s} />
      {showInvite && <InvitePopup update={update} />}
      {s.round >= MAX_ROUNDS && !out && <VipBanner />}
      {out ? <EndBox onWithdraw={openWithdraw} /> : (
        <div className="rp-games">
          {GAMES.map((g) => (
            <button key={g.id} type="button" className={`rp-game is-${g.id}`} onClick={() => update({ stage: 'game', game: g.id })}>
              <span className="rp-game-art"><GameIcon id={g.id} /></span>
              <span className="rp-game-text">
                <b>{g.name}</b>
                <span>{g.desc}</span>
              </span>
              <span className="rp-game-play">플레이 · ×{PAYOUT}</span>
            </button>
          ))}
        </div>
      )}
      <Feed />
      {!out && <WithdrawButton s={s} onClick={openWithdraw} />}
      {withdrawing && <WithdrawPopup s={s} onClose={closeWithdraw} />}
    </div>
  )
}

function ResultBanner({ result, round }) {
  if (result.timeout) return <p className="rp-result" role="status">시간이 끝나 이번 판은 넘어갔어요.</p>
  return (
    <div className={`rp-outcome ${result.win ? 'is-win' : 'is-lose'}`} role="status">
      <p className="rp-outcome-head">{round}판 결과</p>
      <p className="rp-outcome-num">{result.win ? `+${won(result.bet)}` : `-${won(result.bet)}`}</p>
      <p className="rp-outcome-text">
        {result.win
          ? `당첨! 건 돈 ${won(result.bet)} → ${won(result.bet * PAYOUT)} 받음 (${PAYOUT}배)`
          : `건 돈 ${won(result.bet)}을 잃었어요`}
      </p>
    </div>
  )
}

// 카지노 칩: 금액마다 색이 다르고, 테두리 무늬·안쪽 고리·금액 표시
const CHIP_COLOR = { 10000: '#1e5bd8', 30000: '#1f9d55', 50000: '#d32f2f', 100000: '#1b1b1b', 200000: '#c99a1c', 300000: '#e65100' }
const short = (b) => (b >= 10000 ? `${b / 10000}만` : `${b}`)

function Chip({ amount, label }) {
  const c = CHIP_COLOR[amount] ?? '#5d4037'
  return (
    <svg viewBox="0 0 64 64" className="rp-chip-svg" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill={c} />
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} x="28" y="2.5" width="8" height="9" rx="1.5" fill="#fff" transform={`rotate(${k * 45} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="21" fill={c} stroke="#fff" strokeWidth="1.6" strokeDasharray="3 2.4" />
      <circle cx="32" cy="32" r="16.5" fill="rgba(255,255,255,.12)" />
      <text x="32" y="37" className="rp-chip-text">{label ?? short(amount)}</text>
    </svg>
  )
}

function BetPicker({ s, bet, setBet }) {
  const options = betsOf(s.round + 1).filter((b) => b <= s.money)
  const allIn = options.length === 0
  return (
    <div className="rp-bet">
      <p className="rp-bet-title">베팅 금액을 고르세요</p>
      <div className="rp-chips" role="radiogroup" aria-label="베팅 금액">
        {allIn ? (
          <button type="button" role="radio" aria-checked className="rp-chip is-on" aria-label={`전액 ${won(s.money)}`}>
            <Chip amount={0} label="ALL" />
            <span className="rp-chip-won">{won(s.money)}</span>
          </button>
        ) : options.map((b) => (
          <button key={b} type="button" role="radio" aria-checked={bet === b} className={`rp-chip ${bet === b ? 'is-on' : ''}`} onClick={() => setBet(b)} aria-label={won(b)}>
            <Chip amount={b} />
            <span className="rp-chip-won">{won(b)}</span>
          </button>
        ))}
      </div>
      <p className="rp-bet-now">{allIn ? `남은 ${won(s.money)} 전부 베팅` : `${won(bet)} 베팅 · 이기면 ${won(bet * PAYOUT)} 받음`}</p>
    </div>
  )
}

function GameScreen({ s, update }) {
  const g = gameById(s.game)
  const nextRound = s.round + 1
  const bets = betsOf(nextRound).filter((b) => b <= s.money)
  const [bet, setBet] = useState(bets[0] ?? s.money)
  const [playKey, setPlayKey] = useState(0)
  const [result, setResult] = useState(null)
  const [started, setStarted] = useState(false)
  const [withdrawing, openWithdraw, closeWithdraw] = useWithdraw(s, update)
  const betRef = useRef(bet)
  const roundRef = useRef(0)
  const canPlay = s.money > 0
  const safeBet = bets.length === 0 ? s.money : bets.includes(bet) ? bet : bets[0]
  const high = phaseOf(nextRound) === 'high'

  const onStart = useCallback(() => {
    betRef.current = safeBet
    roundRef.current = nextRound
    setStarted(true)
  }, [safeBet, nextRound])

  const onDone = useCallback((win, near) => {
    const b = betRef.current
    const ph = phaseOf(roundRef.current)
    setResult({ win, bet: b })
    update((p) => {
      const round = p.round + 1
      // 이기면 건 돈의 2배를 받는다 → 순이익은 건 돈만큼
      const money = Math.max(0, p.money + (win ? b * (PAYOUT - 1) : -b))
      return {
        round,
        money,
        history: [...p.history, { round, game: p.game, bet: b, win, money, near: near || null, phase: ph }],
        nearMiss: p.nearMiss || (near && ph === 'normal' ? { round, game: p.game, text: near } : null),
        timerSeen: p.timerSeen || p.game === 'horse',
      }
    })
  }, [update])

  const onTimeout = useCallback(() => {
    setResult({ timeout: true })
    update({ timerSeen: true })
  }, [update])

  function again() {
    setResult(null)
    setStarted(false)
    setPlayKey((k) => k + 1)
    const next = betsOf(s.round + 1).filter((b) => b <= s.money)
    if (!next.includes(bet)) setBet(next[0] ?? s.money)
  }

  const props = { win: winOf(nextRound), onStart, onDone, disabled: !canPlay }
  const ready = !result && !started && canPlay

  return (
    <div className="rp-body">
      <SiteBar s={s} />
      <Stats s={s} />
      <div className={`rp-gamehead is-${g.id}`}>
        <span className="rp-game-art"><GameIcon id={g.id} /></span>
        <div>
          <p className="rp-gamename">{g.name}{high && ready ? ' · VIP 테이블' : ''}</p>
          <p className="rp-small">{g.desc} 이기면 건 돈의 {PAYOUT}배!</p>
        </div>
      </div>

      {ready && high && <VipBanner />}
      {ready && <BetPicker s={s} bet={safeBet} setBet={setBet} />}

      {(canPlay || result) && (
        <div className="rp-stage">
          {g.id === 'roulette' && <RouletteGame key={playKey} {...props} />}
          {g.id === 'dice' && <DiceGame key={playKey} {...props} />}
          {g.id === 'horse' && <HorseGame key={playKey} {...props} onTimeout={onTimeout} />}
          {g.id === 'slot' && <SlotGame key={playKey} {...props} />}
        </div>
      )}

      {result && <ResultBanner result={result} round={s.round} />}
      {result && !result.timeout && !result.win && s.money > 0 && (
        <p className="rp-nudge">{s.round >= MAX_ROUNDS ? '크게 걸면 한 번에 되찾을 수 있어요!' : '아깝네요! 다음 판에 바로 되찾을 수 있어요.'}</p>
      )}
      {result && !result.timeout && s.round >= MAX_ROUNDS && s.money > 0 && <WithdrawToast key={s.round} s={s} onWithdraw={openWithdraw} />}

      {result && canPlay && (
        <div className="rp-pair">
          <button type="button" className="rp-btn rp-primary" onClick={again}>한 판 더</button>
          <button type="button" className="rp-btn" onClick={() => update({ stage: 'lobby', game: null })}>게임 바꾸기</button>
        </div>
      )}
      {ready && <button type="button" className="rp-link" onClick={() => update({ stage: 'lobby', game: null })}>다른 게임 고르기</button>}
      {s.money <= 0 && <EndBox onWithdraw={openWithdraw} />}
      <Feed />
      {s.money > 0 && <WithdrawButton s={s} onClick={openWithdraw} />}
      {withdrawing && <WithdrawPopup s={s} onClose={closeWithdraw} />}
    </div>
  )
}

/* ---------- 다 잃은 뒤 출금: 출금할 돈이 없다 ---------- */

function BrokeScreen({ s, update }) {
  const peak = Math.max(START_MONEY, ...s.history.map((h) => h.money))
  return (
    <div className="page scam">
      <div className="replica">
        <ReplicaLabel s={s} />
        <div className="rp-body">
          <SiteBar s={s} />
          <div className="rp-pop rp-reject" role="alert">
            <p className="rp-big-red">출금 불가</p>
            <p className="rp-rule">출금 가능한 금액이 없습니다. (잔액 0원)</p>
            <p className="rp-small">한때 {won(peak)}까지 있었던 돈은 모두 사이트 안에서 사라졌어요.</p>
          </div>
        </div>
      </div>
      <div className="reality" role="status">
        <p>이게 불법도박의 현실입니다.</p>
        <p>딴 돈도, 처음 가진 돈도 모두 사라졌습니다.</p>
        <p className="reality-last">이제는 몸소 느끼셨죠?</p>
        <button type="button" className="btn btn-primary btn-wide" onClick={() => update({ stage: 'quiz', brokeTried: true })}>다음 단계: 수법 찾기</button>
      </div>
    </div>
  )
}

/* ---------- 출금: 정상 처리처럼 보임(4초) → 인터넷 오류 → 사이트 사라짐 → 현실 안내 ---------- */

const PAY_STEPS = ['출금 신청 접수', '보안 확인', '등록 계좌로 송금']

function ScamScreen({ s, update, goHome }) {
  const [phase, setPhase] = useState(s.scamDone ? 'gone' : 'paying') // paying | error | gone
  const [progress, setProgress] = useState(0)
  const [showMsg, setShowMsg] = useState(s.scamDone)
  const amount = s.scamAt ?? s.money

  // 1) 정상 출금처럼: 진행 막대가 차오르고 단계가 하나씩 완료된다 (92%에서 멈춤)
  useEffect(() => {
    if (phase !== 'paying') return undefined
    const started = Date.now()
    const tick = setInterval(() => setProgress(Math.min(92, ((Date.now() - started) / PROCESS_MS) * 100)), 80)
    const t = setTimeout(() => setPhase('error'), PROCESS_MS)
    return () => { clearInterval(tick); clearTimeout(t) }
  }, [phase])

  // 2) 인터넷 오류 → 3) 사이트가 사라짐
  useEffect(() => {
    if (phase !== 'error') return undefined
    const t = setTimeout(() => {
      setPhase('gone')
      update({ scamDone: true })
    }, ERROR_MS)
    return () => clearTimeout(t)
  }, [phase, update])

  useEffect(() => {
    if (phase !== 'gone' || showMsg) return undefined
    const t = setTimeout(() => setShowMsg(true), 1800)
    return () => clearTimeout(t)
  }, [phase, showMsg])

  const doneSteps = progress >= 66 ? 2 : progress >= 33 ? 1 : 0

  return (
    <div className="page scam">
      <div className={`replica ${phase === 'error' ? 'is-lagging' : ''} ${phase === 'gone' ? 'is-gone' : ''}`}>
        <ReplicaLabel s={s} />
        {phase !== 'gone' ? (
          <div className="rp-body" aria-busy={phase === 'error'}>
            <SiteBar s={s} />
            <div className="rp-pop rp-paying" role="status">
              <p className="rp-pay-head">
                <span className="rp-pay-check" aria-hidden="true">✓</span>
                출금 신청이 접수되었습니다
              </p>
              <p className="rp-pay-amount">{won(amount)}</p>
              <div className="rp-pay-bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
              <ol className="rp-pay-steps">
                {PAY_STEPS.map((st, i) => (
                  <li key={st} className={i < doneSteps ? 'is-done' : i === doneSteps ? 'is-now' : ''}>
                    <span aria-hidden="true">{i < doneSteps ? '✓' : i === doneSteps ? '…' : ''}</span>{st}
                  </li>
                ))}
              </ol>
              <p className="rp-small">보통 1분 안에 입금돼요. 창을 닫지 마세요.</p>
            </div>
            {phase === 'error' && (
              <div className="rp-neterr" role="alert">
                <svg viewBox="0 0 48 48" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 18a26 26 0 0 1 36 0M12 25a17 17 0 0 1 24 0M18 32a8 8 0 0 1 12 0" /><circle cx="24" cy="39" r="2" fill="currentColor" /><path d="M8 8l32 32" />
                </svg>
                <p className="rp-neterr-title">인터넷 연결이 끊겼습니다</p>
                <p className="rp-neterr-code">ERR_INTERNET_DISCONNECTED</p>
                <p className="rp-small"><span className="rp-spinner is-small" aria-hidden="true" /> 다시 연결하는 중…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rp-dead" role="alert">
            <p className="rp-dead-code">ERR_CONNECTION_CLOSED · 사이트를 찾을 수 없음</p>
            <p className="rp-dead-title">운영자가 도망쳤습니다.</p>
            <p className="rp-dead-sub">사이트가 사라졌어요. 출금하던 {won(amount)}도 함께 사라졌어요.</p>
          </div>
        )}
      </div>

      {showMsg && (
        <div className="reality" role="status">
          <p>이게 불법도박의 현실입니다.</p>
          <p>돈을 따도 따는 게 아닙니다.</p>
          <p className="reality-last">이제는 몸소 느끼셨죠?</p>
          <button type="button" className="btn btn-primary btn-wide" onClick={() => update({ stage: 'quiz' })}>다음 단계: 수법 찾기</button>
        </div>
      )}
    </div>
  )
}

/* ---------- 수법 찾기 ---------- */

function QuizScreen({ update }) {
  const [picked, setPicked] = useState([])
  const toggle = (id) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  return (
    <section className="page" aria-labelledby="quiz-title">
      <header className="page-head">
        <p className="eyebrow">정답을 보기 전에</p>
        <h2 id="quiz-title">수상했던 장면 고르기</h2>
        <p className="lead">방금 체험에서 "이상한데?" 싶었던 장면을 모두 골라 보세요. 실제로 없었던 장면도 섞여 있어요.</p>
      </header>
      <ul className="checklist">
        {QUIZ.map((q) => (
          <li key={q.id}>
            <button type="button" role="checkbox" aria-checked={picked.includes(q.id)} className={`check ${picked.includes(q.id) ? 'is-on' : ''}`} onClick={() => toggle(q.id)}>
              <span className="check-box" aria-hidden="true" />
              {q.text}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-primary btn-wide" onClick={() => update({ spotted: picked, stage: 'reveal' })}>
        다음 단계: 정답 확인하기 ({picked.length}개 고름)
      </button>
    </section>
  )
}

/* ---------- 정답 공개 ---------- */

function leadingWins(history) {
  let n = 0
  while (n < history.length && history[n].win) n++
  return n
}

function trickStatus(s) {
  const lead = leadingWins(s.history)
  const names = [...new Set(s.history.slice(0, lead).map((h) => gameById(h.game).name))].join(', ')
  const near = s.nearMiss
  const high = s.history.filter((h) => h.phase === 'high')
  return {
    T1: lead > 0
      ? { hit: true, where: `${lead > 1 ? `1~${lead}판` : '1판'} 연속으로 이김 · ${names}` }
      : { hit: false, where: '게임을 하지 않았어요' },
    T3: near
      ? { hit: true, where: `${near.round}판 · ${gameById(near.game).name}: ${near.text}` }
      : { hit: false, where: '이번 체험에서는 나오지 않았어요' },
    T4: { hit: true, where: '화면 아래 "LIVE 당첨" 소식' },
    T5: { hit: true, where: s.withdrawTries > 0 ? `출금을 ${s.withdrawTries}번 눌렀지만 "5판 이상" 조건으로 막혔어요` : '"5판 이상" 조건 때문에 계속 게임을 했어요' },
    T6: s.timerSeen
      ? { hit: true, where: '경마 "발매 마감 15초 전" 타이머' }
      : { hit: false, where: '경마를 하지 않아서 나오지 않았어요' },
    T7: { hit: true, where: '가입 화면에서 이름·계좌·신분증 요구' },
    T8: s.invite === 'sent'
      ? { hit: true, where: '친구를 초대했어요 (체험이라 실제로 보내지 않았어요)' }
      : { hit: false, where: s.invite === 'declined' ? '초대를 거절했어요' : `${INVITE_AFTER_ROUND}판 전에 끝나서 나오지 않았어요` },
    T9: high.length > 0
      ? { hit: true, where: `6판부터 판돈이 커졌고 ${high.length}판 모두 졌어요 (잃은 돈 ${won(high.reduce((a, h) => a + h.bet, 0))})` }
      : { hit: false, where: '5판 뒤 더 하지 않아서 나오지 않았어요' },
    T10: s.scamDone
      ? { hit: true, where: `${won(s.scamAt)} 출금이 진행되는 듯하다가 4초 뒤 인터넷 오류 → 사이트가 사라짐` }
      : { hit: false, where: '출금까지 가지 않았어요' },
  }
}

function MoneyChart({ history }) {
  const pts = [{ round: 0, money: START_MONEY }, ...history]
  const maxR = Math.max(MAX_ROUNDS, history.length)
  const maxM = Math.max(START_MONEY, ...pts.map((p) => p.money)) * 1.12
  const x = (r) => 24 + (r / maxR) * 256
  const y = (m) => 120 - (m / maxM) * 105
  const last = pts[pts.length - 1]
  const peak = pts.reduce((a, p) => (p.money > a.money ? p : a), pts[0])
  const lead = leadingWins(history)
  return (
    <figure className="card chart">
      <p className="chart-title">내 돈은 이렇게 움직였어요</p>
      <svg viewBox="0 0 300 140" role="img" aria-label={`보유 금액 변화: 시작 ${won(START_MONEY)}, 최고 ${won(peak.money)}, 끝 ${won(last.money)}, 받은 돈 0원`}>
        {lead > 0 && <rect x={x(0.5)} y="8" width={x(lead + 0.5) - x(0.5)} height="112" className="c-zone" />}
        {lead > 0 && <text x={(x(0.5) + x(lead + 0.5)) / 2} y="19" textAnchor="middle" className="c-zone-t">따게 해 준 구간</text>}
        <line x1="24" x2="280" y1={y(START_MONEY)} y2={y(START_MONEY)} className="c-base" />
        <line x1="24" x2="280" y1="120" y2="120" className="c-axis" />
        {history.length > MAX_ROUNDS && <line x1={x(MAX_ROUNDS)} x2={x(MAX_ROUNDS)} y1="8" y2="120" className="c-goal" />}
        {history.length > MAX_ROUNDS && <text x={x(MAX_ROUNDS) + 3} y="30" className="c-t c-goal-t">판돈 UP</text>}
        <polyline points={pts.map((p) => `${x(p.round)},${y(p.money)}`).join(' ')} className="c-line" />
        {history.map((h) => <circle key={h.round} cx={x(h.round)} cy={y(h.money)} r="2.4" className="c-dot" />)}
        <circle cx={x(last.round)} cy={y(last.money)} r="3.6" className="c-end" />
        <text x="24" y="133" className="c-t">0판</text>
        <text x="280" y="133" textAnchor="end" className="c-t">{maxR}판</text>
        <text x="28" y={y(START_MONEY) - 4} className="c-t">시작 {won(START_MONEY)}</text>
      </svg>
      <figcaption className="muted small">시작 {won(START_MONEY)} → 최고 <b>{won(peak.money)}</b> ({rateOf(peak.money) >= 0 ? '+' : ''}{rateOf(peak.money).toFixed(0)}%) → 받은 돈 <b className="danger">0원</b></figcaption>
    </figure>
  )
}

const trickName = (id) => TRICKS.find((t) => t.id === id).name

function roundWhy(h, lead) {
  const g = gameById(h.game)
  if (h.phase === 'high') {
    return { tag: 'T9', seen: `VIP 테이블에서 ${won(h.bet)}을 걸었어요.${h.near ? ` ${h.near}.` : ''}`, truth: `판돈을 키우게 한 뒤부터는 어떤 게임을 해도 지게 짜여 있었어요. ${g.secret}` }
  }
  if (h.win && h.round <= lead) return { tag: 'T1', seen: null, truth: '미끼였어요. 처음에는 계속 이기게 해서 "나는 된다"고 믿게 만들어요.' }
  if (h.win) return { tag: 'T1', seen: null, truth: '한 번 진 뒤에 다시 이기게 해서 "역시 나는 된다"고 믿게 만들었어요.' }
  return { tag: 'T3', seen: h.near ? `${h.near}.` : null, truth: `${g.secret} 한 번 지게 해야 "되찾자"는 마음으로 계속 하게 돼요.` }
}

function RoundReview({ history }) {
  const lead = leadingWins(history)
  return (
    <div className="card">
      <h3 className="card-title">내가 한 {history.length}판 되짚기</h3>
      <ol className="rounds">
        {history.map((h) => {
          const why = roundWhy(h, lead)
          return (
            <li key={h.round} className="round">
              <div className="round-top">
                <span className="round-no">{h.round}판</span>
                <b>{gameById(h.game).name}</b>
                <span className={`tag ${h.win ? 'tag-found' : 'tag-hit'}`}>
                  {h.win ? '+' : '-'}{won(h.bet)} {h.win ? '땀' : '잃음'}
                </span>
                <span className="muted small">보유 {won(h.money)} ({rateOf(h.money) >= 0 ? '+' : ''}{rateOf(h.money).toFixed(0)}%)</span>
              </div>
              {why.seen && <p><span className="round-label">내가 본 장면</span>{why.seen}</p>}
              <p><span className="round-label is-truth">사실은</span>{why.truth}</p>
              <p className="muted small">숨은 수법 · {trickName(why.tag)}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function WithdrawReview({ s }) {
  if (!s.scamDone && s.brokeTried) {
    const peak = Math.max(START_MONEY, ...s.history.map((h) => h.money))
    return (
      <div className="card">
        <h3 className="card-title">출금하려던 순간</h3>
        <p><span className="round-label">내가 본 장면</span>한때 {won(peak)}까지 있었는데, 계속 하다 보니 0원이 됐어요. 출금하기를 눌렀지만 "출금 가능한 금액이 없습니다"만 떴어요.</p>
        <p><span className="round-label is-truth">사실은</span>5판 뒤부터는 판돈을 키우게 하고 계속 지게 짜여 있었어요. "출금할 수 있다"는 알림을 봤을 때 멈췄어도, 출금하는 순간 사이트가 사라지게 되어 있었어요.</p>
        <p className="muted small">숨은 수법 · {trickName('T9')}</p>
      </div>
    )
  }
  if (!s.scamDone) return null
  return (
    <div className="card">
      <h3 className="card-title">출금하려던 순간</h3>
      <p><span className="round-label">내가 본 장면</span>{won(s.scamAt)} 출금이 "접수 → 보안 확인 → 송금 중"으로 정상 진행되는 듯하다가, 4초 뒤 인터넷 오류가 나고 사이트가 사라졌어요.</p>
      <p><span className="round-label is-truth">사실은</span>인터넷 문제가 아니었어요. 돈이 쌓여 출금하려는 순간 운영자가 사이트를 닫고 사라진 거예요. 불법 사이트에서는 아무리 많이 따도 그 돈을 받을 수 없어요.</p>
      <p className="muted small">숨은 수법 · {trickName('T10')}</p>
    </div>
  )
}

function LoseStructure() {
  return (
    <div className="structure">
      <h3 className="card-title">불법 도박은 돈을 받을 수 없는 구조예요</h3>
      <ol className="structure-list">
        <li>
          <b>결과는 운이 아니라 사이트가 정해요</b>
          <span>이번 체험처럼 불법 사이트는 프로그램으로 이기고 지는 것을 정해요. 내가 고를 수 있는 건 게임뿐, 결과는 못 골라요.</span>
        </li>
        <li>
          <b>출금 조건은 계속 하게 만드는 장치예요</b>
          <span>"5판 이상 해야 출금"처럼 조건을 걸어 돈을 사이트 안에 붙잡아 둬요.</span>
        </li>
        <li>
          <b>판돈이 커지면 지게 만들어요</b>
          <span>"크게 걸면 크게 딴다"며 판돈을 올리게 한 뒤, 그때부터 계속 지게 해서 가져가요.</span>
        </li>
        <li>
          <b>출금하는 순간 사라져요</b>
          <span>출금이 되는 것처럼 보여 주다가 "인터넷 오류" 같은 핑계로 시간을 끌고 사이트를 닫아요. 불법이라 돌려받을 곳이 없어요.</span>
        </li>
      </ol>
      <p className="structure-sum">그래서 불법 도박은 <mark>"잘하면 따는 게임"이 아니라 "따도 받을 수 없는 게임"</mark>이에요.</p>
    </div>
  )
}

function RevealScreen({ s, update }) {
  const status = trickStatus(s)
  const spotted = s.spotted ?? []
  const hitCount = TRICKS.filter((t) => status[t.id].hit).length
  const foundCount = TRICKS.filter((t) => spotted.includes(t.id)).length
  const decoys = QUIZ.filter((q) => q.decoy && spotted.includes(q.id))
  const title = s.scamDone
    ? `${won(s.scamAt)}을 모았지만, 받은 돈은 0원이었어요`
    : `${won(START_MONEY)}으로 시작해 ${s.history.length}판 만에 모두 잃었어요`
  return (
    <section className="page" aria-labelledby="reveal-title">
      <header className="page-head">
        <p className="eyebrow">정답 공개</p>
        <h2 id="reveal-title">{title}</h2>
        <p className="lead">어떤 게임을 골라도, 얼마를 걸어도 결과는 같았어요. 따게 해 준 것도, 판돈을 키우게 한 것도 모두 운영자가 정한 각본이었어요.</p>
      </header>

      <dl className="facts">
        <div><dt>받은 돈</dt><dd className="danger">0원</dd></div>
        <div><dt>내가 당한 수법</dt><dd>{hitCount}개</dd></div>
        <div><dt>내가 찾아낸 수법</dt><dd>{foundCount}개</dd></div>
      </dl>

      <MoneyChart history={s.history} />
      {s.history.length > 0 && <RoundReview history={s.history} />}
      <WithdrawReview s={s} />
      <LoseStructure />

      <h3 className="list-head">운영자가 쓴 수법 {TRICKS.length}가지</h3>
      <ol className="tricks">
        {TRICKS.map((t, i) => {
          const st = status[t.id]
          const found = spotted.includes(t.id)
          return (
            <li key={t.id} className="trick">
              <div className="trick-top">
                <span className="trick-id">{i + 1}</span>
                <b className="trick-name">{t.name}</b>
              </div>
              <div className="trick-tags">
                <span className={`tag ${st.hit ? 'tag-hit' : 'tag-none'}`}>{st.hit ? '당함' : '피함·안 나옴'}</span>
                <span className={`tag ${found ? 'tag-found' : 'tag-none'}`}>{found ? '내가 찾음' : '못 찾음'}</span>
              </div>
              <p className="muted small">{st.where}</p>
              <p>{t.explain}</p>
              <p className="avoid"><mark>{t.avoid}</mark></p>
            </li>
          )
        })}
      </ol>

      {decoys.length > 0 && (
        <p className="notice">"{decoys.map((d) => d.text).join('", "')}"는 실제로 없던 장면이에요. 불법 사이트는 규칙을 친절하게 알려 주거나 돈을 바로 내주지 않아요.</p>
      )}

      <details className="card">
        <summary>게임마다 몰래 한 일 ({GAMES.length}종 모두)</summary>
        <ul className="secrets">
          {GAMES.map((g) => <li key={g.id}><b>{g.name}</b> · {g.secret}</li>)}
        </ul>
      </details>

      <p className="verdict">손대는 순간 이미 진 판입니다.<br />불법 도박, 따도 받을 수 없습니다.</p>

      <Question value={s.after} onChange={(a) => update({ after: a })} />
      {s.after && (
        <div className="compare">
          <div><span className="muted small">체험 전</span><b>{s.before ?? '-'}</b></div>
          <div className="is-after"><span className="muted small">지금</span><b>{s.after}</b></div>
        </div>
      )}

      <Hotlines />
      <button type="button" className="btn btn-primary btn-wide" onClick={() => update({ stage: 'wrap' })}>다음 단계: 마무리</button>
    </section>
  )
}

// 마무리: 학생 활동 결과(활동지). 화면에서 보고 인쇄할 수 있지만 어디에도 저장·전송하지 않는다.
function ActivitySheet({ s }) {
  const [pledge, setPledge] = useState('')
  const status = trickStatus(s)
  const spotted = (s.spotted ?? []).filter((id) => TRICKS.some((t) => t.id === id))
  const hit = TRICKS.filter((t) => status[t.id].hit)
  const peak = Math.max(START_MONEY, ...s.history.map((h) => h.money))
  return (
    <section className="sheet" aria-labelledby="sheet-title">
      <div className="sheet-head">
        <h3 id="sheet-title">나의 활동 결과</h3>
        <p className="sheet-sub">몸소 깨닫는 불법도박의 실체 · 불법도박 예방교육</p>
        <p className="sheet-name"><span>학년 · 반 · 번호</span><i aria-hidden="true" /></p>
      </div>
      <dl className="sheet-grid">
        <div><dt>체험 전 생각</dt><dd>불법 도박으로 돈을 벌 수 있다 → <b>{s.before ?? '-'}</b></dd></div>
        <div><dt>체험 후 생각</dt><dd>불법 도박으로 돈을 벌 수 있다 → <b>{s.after ?? '아직 답하지 않음'}</b></dd></div>
        <div><dt>한 판 수</dt><dd>{s.history.length}판</dd></div>
        <div><dt>가장 많았을 때</dt><dd>{won(peak)} ({rateOf(peak) >= 0 ? '+' : ''}{rateOf(peak).toFixed(0)}%)</dd></div>
        <div><dt>실제로 받은 돈</dt><dd className="danger"><b>0원</b></dd></div>
        <div><dt>당한 수법 / 찾아낸 수법</dt><dd>{hit.length}개 / {spotted.length}개</dd></div>
      </dl>
      <div className="sheet-block">
        <p className="sheet-label">내가 찾아낸 수법</p>
        {spotted.length > 0
          ? <ul className="sheet-tags">{spotted.map((id) => <li key={id}>{TRICKS.find((t) => t.id === id).name}</li>)}</ul>
          : <p className="muted">찾아낸 수법이 없어요. 정답 화면을 다시 살펴보세요.</p>}
      </div>
      <label className="sheet-block" htmlFor="pledge">
        <span className="sheet-label">나의 다짐 한 줄</span>
        <input id="pledge" className="sheet-input" type="text" maxLength={60} value={pledge} onChange={(e) => setPledge(e.target.value)} placeholder="예) 친구가 권해도 나는 하지 않는다." />
        <span className="muted small">입력한 내용은 저장되거나 전송되지 않아요. 인쇄할 때만 활동지에 들어가요.</span>
      </label>
      <div className="row no-print">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>활동 결과 인쇄하기</button>
      </div>
    </section>
  )
}

function WrapScreen({ s, update, goHome }) {
  return (
    <section className="page" aria-labelledby="wrap-title">
      <header className="page-head">
        <p className="eyebrow">마무리 활동</p>
        <h2 id="wrap-title">친구가 권할 때 하는 말</h2>
        <p className="lead">불법 도박은 대부분 친구 권유나 광고로 시작돼요. 거절하는 말을 소리 내어 한 번 말해 보세요.</p>
      </header>
      <div className="say">
        <p>"그거 운영자가 결과 정하는 거야."</p>
        <p>"따도 못 받아. 나는 안 해. 너도 하지 마."</p>
      </div>
      <div className="card">
        <h3>같이 생각해 봐요</h3>
        <ol className="steps">
          <li>처음에 계속 이겼을 때 수익률이 몇 %까지 올라갔나요? 그때 어떤 기분이었나요?</li>
          <li>"VIP 테이블 · 크게 걸고 크게 따세요"가 떴을 때 어떤 마음이 들었나요?</li>
          <li>출금하려는 순간 사이트가 사라졌을 때 어떤 기분이었나요? 현실이라면 그 돈은 누구 돈이었을까요?</li>
        </ol>
      </div>
      <ActivitySheet s={s} />
      <Hotlines />
      <div className="row no-print">
        <button type="button" className="btn" onClick={() => update({ stage: 'reveal' })}>정답 다시 보기</button>
        <button type="button" className="btn btn-quiet" onClick={goHome}>처음 화면으로</button>
      </div>
    </section>
  )
}

export default function Experience({ goHelp, goHome }) {
  const [s, setS] = useState(() => {
    try { return { ...fresh(), ...JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') } } catch { return fresh() }
  })

  // 새로고침해도 하던 단계·판·금액이 그대로 이어지도록 세션 저장소에 둔다 (탭을 닫으면 지워짐)
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* 무시 */ }
  }, [s])

  // 예전 버전이 남긴 기록을 지운다. 이제는 아무것도 저장하지 않는다.
  useEffect(() => {
    try { OLD_KEYS.forEach((k) => localStorage.removeItem(k)) } catch { /* 무시 */ }
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [s.stage])

  const update = useCallback((patch) => {
    setS((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }))
  }, [])

  const begin = useCallback((before) => {
    setS({ ...fresh(), before, stage: 'signup' })
  }, [])

  if (s.stage === 'start') return <StartScreen begin={begin} goHelp={goHelp} />

  let body
  if (s.stage === 'scam') body = <ScamScreen s={s} update={update} goHome={goHome} />
  else if (s.stage === 'broke') body = <BrokeScreen s={s} update={update} />
  else if (s.stage === 'quiz') body = <QuizScreen update={update} />
  else if (s.stage === 'reveal') body = <RevealScreen s={s} update={update} />
  else if (s.stage === 'wrap') body = <WrapScreen s={s} update={update} goHome={goHome} />
  else {
    body = (
      <div className="replica">
        <ReplicaLabel s={s} />
        {s.stage === 'signup' && <SignupScreen update={update} />}
        {s.stage === 'lobby' && <LobbyScreen s={s} update={update} />}
        {s.stage === 'game' && <GameScreen s={s} update={update} />}
      </div>
    )
  }

  return (
    <div className="exp">
      <Stepper s={s} />
      {body}
    </div>
  )
}
