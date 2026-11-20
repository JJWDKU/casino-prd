import { useEffect, useRef, useState } from 'react'

// 각 게임은 결과(win)를 미리 받고, 그에 맞는 장면만 연출한다.
// onStart() — 베팅 확정, onDone(win, nearMiss) — nearMiss: 아깝게 진 장면 설명(T3) 또는 null
// 화면 전체를 흔드는 연출은 쓰지 않는다(어지러움). 움직임은 게임 도구(공·컵·릴·말) 안에서만.
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const pickOne = (list) => list[Math.floor(Math.random() * list.length)]
const rand = (n) => Math.floor(Math.random() * n)

function useTimers() {
  const ref = useRef([])
  useEffect(() => () => ref.current.forEach((t) => { clearTimeout(t); clearInterval(t) }), [])
  return ref
}

/* ======================= 룰렛 ======================= */

const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const colorOf = (n) => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black')
const COLOR_KO = { red: '빨강', black: '검정', green: '초록' }
const POCKET = 360 / WHEEL_ORDER.length
const ROULETTE_HISTORY = [17, 8, 26, 11, 33, 4, 21, 0, 35, 12]
const SPIN_MS = 6400
const BALL_OUT = 14 // 공이 도는 바깥 홈
const BALL_IN = 31 // 칸 안

function polar(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]
}
function wedge(i, r1, r2) {
  const a1 = i * POCKET
  const a2 = a1 + POCKET
  const [x1, y1] = polar(r2, a1)
  const [x2, y2] = polar(r2, a2)
  const [x3, y3] = polar(r1, a2)
  const [x4, y4] = polar(r1, a1)
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`
}

function RouletteWheel({ wheelAngle, ballAngle, ballY }) {
  return (
    <svg className="g-rl-wheel" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="rl-wood" cx="50%" cy="50%" r="50%"><stop offset="80%" stopColor="#6b3d14" /><stop offset="100%" stopColor="#3a1f08" /></radialGradient>
        <radialGradient id="rl-cone" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#a87b3c" /><stop offset="100%" stopColor="#5a3412" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="99" fill="url(#rl-wood)" stroke="#b8892a" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="88" className="g-rl-track" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <circle key={d} cx={polar(91, d)[0]} cy={polar(91, d)[1]} r="1.6" className="g-rl-deflector" />)}
      <g style={{ transform: `rotate(${wheelAngle}deg)` }} className="g-rl-rotor">
        {WHEEL_ORDER.map((n, i) => (
          <g key={n}>
            <path d={wedge(i, 56, 80)} className={`g-rl-pocket c-${colorOf(n)}`} />
            <text x="100" y="27.5" className="g-rl-num" transform={`rotate(${i * POCKET + POCKET / 2} 100 100)`}>{n}</text>
          </g>
        ))}
        <circle cx="100" cy="100" r="56" fill="url(#rl-cone)" stroke="#b8892a" strokeWidth="1.2" />
        {[0, 90, 180, 270].map((d) => <path key={d} d="M100 62 L104 96 L100 100 L96 96 Z" className="g-rl-spoke" transform={`rotate(${d} 100 100)`} />)}
        <circle cx="100" cy="100" r="10" className="g-rl-cap" />
      </g>
      <g style={{ transform: `rotate(${ballAngle}deg)` }} className="g-rl-ballorbit">
        <circle cx="100" cy={ballY} r="4.4" className="g-rl-ball" />
      </g>
    </svg>
  )
}

function RouletteBoard({ pick, result, onPick, locked }) {
  const rows = [3, 2, 1].map((r) => Array.from({ length: 12 }, (_, c) => c * 3 + r))
  return (
    <div className="g-rl-board">
      <div className="g-rl-grid">
        <span className={`g-rl-cell c-green zero ${result === 0 ? 'is-hit' : ''}`}>0</span>
        {rows.flat().map((n) => <span key={n} className={`g-rl-cell c-${colorOf(n)} ${result === n ? 'is-hit' : ''}`}>{n}</span>)}
      </div>
      <div className="g-rl-outside">
        {['red', 'black'].map((c) => (
          <button key={c} type="button" className={`g-rl-out c-${c} ${pick === c ? 'is-picked' : ''} ${result !== null && colorOf(result) === c ? 'is-hit' : ''}`} onClick={() => onPick(c)} disabled={locked}>
            <i aria-hidden="true" />
            <b>{COLOR_KO[c]}</b>
            <span>×2</span>
            {pick === c && <em className="g-chip-on" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RouletteGame({ win, onStart, onDone, disabled }) {
  const [pick, setPick] = useState(null)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [ballAngle, setBallAngle] = useState(0)
  const [ballY, setBallY] = useState(BALL_OUT)
  const [result, setResult] = useState(null)
  const [stage, setStage] = useState('bet') // bet | spin | slow | drop | done
  const timers = useTimers()

  function choose(side) {
    if (pick || disabled) return
    setPick(side)
    onStart()
    const other = side === 'red' ? 'black' : 'red'
    const loseToZero = !win && Math.random() < 0.25
    const pool = WHEEL_ORDER.filter((n) => (win ? colorOf(n) === side : loseToZero ? n === 0 : colorOf(n) === other))
    const n = pickOne(pool)
    const i = WHEEL_ORDER.indexOf(n)
    const ms = reduced() ? 80 : SPIN_MS
    const at = (f, fn) => timers.current.push(setTimeout(fn, ms * f))
    // 바퀴는 천천히 시계 방향, 공은 반대 방향으로 돌다가 맨 위(결과 칸)에서 만난다
    setWheelAngle(360 * 3 - (i * POCKET + POCKET / 2))
    setBallAngle(-360 * 6)
    setStage('spin')
    at(0.5, () => setStage('slow'))
    // 공이 칸에 떨어지며 두어 번 튄다 (딱 적당히)
    at(0.7, () => { setStage('drop'); setBallY(BALL_IN) })
    at(0.78, () => setBallY(BALL_IN - 7))
    at(0.86, () => setBallY(BALL_IN))
    at(0.92, () => setBallY(BALL_IN - 3))
    at(0.97, () => setBallY(BALL_IN))
    at(1, () => {
      setResult(n)
      setStage('done')
      const near = win ? null : n === 0 ? '공이 0(초록)에 떨어져 빨강·검정 모두 졌어요' : `공이 ${COLOR_KO[side]} 칸 바로 옆 ${n}번(${COLOR_KO[other]})에 떨어졌어요`
      onDone(win, near)
    })
  }

  const call = {
    bet: '빨강이나 검정에 칩을 올리세요',
    spin: 'No more bets! 공이 돌기 시작했어요',
    slow: '속도가 줄어들어요…',
    drop: '공이 떨어집니다!',
    done: result !== null ? `${result} ${COLOR_KO[colorOf(result)]}!` : '',
  }[stage]

  return (
    <div className="g-roulette">
      <div className="g-marquee" aria-label="최근 결과">
        <span>최근 결과</span>
        <div>{ROULETTE_HISTORY.map((n, i) => <i key={i} className={`dot c-${colorOf(n)}`}>{n}</i>)}</div>
      </div>
      <div className={`g-rl-stage is-${stage}`}>
        <span className="g-rl-pointer" aria-hidden="true" />
        <RouletteWheel wheelAngle={wheelAngle} ballAngle={ballAngle} ballY={ballY} />
        {result !== null && <span className={`g-rl-result c-${colorOf(result)}`} role="status">{result}</span>}
      </div>
      <p className={`g-call is-${stage}`} aria-live="polite">{call}</p>
      <RouletteBoard pick={pick} result={result} onPick={choose} locked={!!pick || disabled} />
    </div>
  )
}

/* ======================= 주사위 홀짝 ======================= */

const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }
const DICE_ROAD = ['짝', '홀', '짝', '짝', '홀', '홀', '짝', '짝', '짝', '짝'] // 가짜 기록: 마지막 4번 짝

function Die({ value }) {
  return (
    <span className="g-die" aria-label={`주사위 ${value}`}>
      {Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[value].includes(i + 1) ? 'on' : ''} />)}
    </span>
  )
}

export function DiceGame({ win, onStart, onDone, disabled }) {
  const [pick, setPick] = useState(null)
  const [dice, setDice] = useState([2, 5, 3])
  const [cup, setCup] = useState('up') // up | down | shake | lifted
  const [result, setResult] = useState(null)
  const timers = useTimers()

  function choose(side) {
    if (pick || disabled) return
    setPick(side)
    onStart()
    const target = win ? side : side === '홀' ? '짝' : '홀'
    let d
    do { d = [1 + rand(6), 1 + rand(6), 1 + rand(6)] } while (((d[0] + d[1] + d[2]) % 2 === 1 ? '홀' : '짝') !== target)
    const fast = reduced()
    const at = (ms, fn) => timers.current.push(setTimeout(fn, fast ? 20 : ms))
    setCup('down')
    at(500, () => setCup('shake')) // 딜러가 컵을 흔든다
    at(900, () => setDice(d))
    at(2100, () => setCup('down'))
    at(2700, () => setCup('lifted'))
    at(3300, () => {
      setResult({ sum: d[0] + d[1] + d[2], side: target })
      onDone(win, win ? null : side === '홀' ? '"짝이 4번 나왔으니 이번엔 홀"이라고 믿었는데 또 짝이 나왔어요' : '홀이 나와 아깝게 졌어요')
    })
  }

  const status = result
    ? null
    : cup === 'shake' ? '딜러가 컵을 흔드는 중…' : cup === 'down' && pick ? '컵을 내려놓았어요. 곧 열려요!' : '세 주사위의 합은 홀일까, 짝일까?'

  return (
    <div className="g-dice">
      <div className="g-road" aria-label="최근 결과 기록판">
        <span>결과 기록</span>
        <div>{DICE_ROAD.map((r, i) => <i key={i} className={`dot ${r === '홀' ? 'c-odd' : 'c-even'}`}>{r}</i>)}</div>
      </div>
      <div className="g-dice-table">
        <div className="g-dice-plate">
          {dice.map((v, i) => <Die key={i} value={v} />)}
          <span className={`g-cup is-${cup}`} aria-hidden="true"><i /></span>
        </div>
        <p className="g-dice-sum" aria-live="polite">
          {result
            ? <>{dice.join(' + ')} = <b>{result.sum}</b> · <b className={result.side === '홀' ? 'is-odd' : 'is-even'}>{result.side}</b></>
            : status}
        </p>
      </div>
      <div className="g-dice-bets">
        {['홀', '짝'].map((side) => (
          <button key={side} type="button" className={`g-dice-bet ${side === '홀' ? 'c-odd' : 'c-even'} ${pick === side ? 'is-picked' : ''} ${result && result.side === side ? 'is-hit' : ''}`} onClick={() => choose(side)} disabled={!!pick || disabled}>
            <b>{side}</b><span>{side === '홀' ? 'ODD' : 'EVEN'} · ×2</span>
            {pick === side && <em className="g-chip-on" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ======================= 경마: 보드게임처럼 타원 트랙 ======================= */
// 딸 듯 말 듯: 지는 판은 내 말이 내내 1등으로 달리다가 결승선 바로 앞에서 코 차이로 진다.

const HORSES = [
  { name: '번개돌이', silk: '#f2c230', coat: '#8a5426' },
  { name: '천둥호', silk: '#e53935', coat: '#5b3415' },
  { name: '은하수', silk: '#2f80ed', coat: '#a87443' },
  { name: '태풍', silk: '#43a047', coat: '#3e2716' },
  { name: '흑진주', silk: '#2b2b2b', coat: '#1e1410' },
  { name: '백설', silk: '#f5f5f5', coat: '#d9cdb8' },
  { name: '불꽃', silk: '#fb8c00', coat: '#7a3f18' },
]
const RACE_MS = 8000
const BET_DEADLINE = 15

// 트랙 모양(경기장형 타원): 직선 L, 중심선 반지름 RC, 안쪽 RI, 바깥 RO
const T = { cx: 180, cy: 122, x1: 108, x2: 252, RI: 52, RO: 100, RC: 76 }
const STRAIGHT = T.x2 - T.x1
const LAP = 2 * STRAIGHT + 2 * Math.PI * T.RC
const CELLS = 36

// 중심선 기준 거리 d를 반지름 r 줄의 좌표로 바꾼다. 출발점은 위쪽 직선 왼쪽 끝, 시계 방향.
function trackPoint(d, r) {
  let s = ((d % LAP) + LAP) % LAP
  if (s < STRAIGHT) return [T.x1 + s, T.cy - r]
  s -= STRAIGHT
  const arc = Math.PI * T.RC
  if (s < arc) { const a = s / T.RC; return [T.x2 + r * Math.sin(a), T.cy - r * Math.cos(a)] }
  s -= arc
  if (s < STRAIGHT) return [T.x2 - s, T.cy + r]
  s -= STRAIGHT
  const a = s / T.RC
  return [T.x1 - r * Math.sin(a), T.cy + r * Math.cos(a)]
}
const stadium = (r) => `M${T.x1},${T.cy - r} H${T.x2} A${r},${r} 0 0 1 ${T.x2},${T.cy + r} H${T.x1} A${r},${r} 0 0 1 ${T.x1},${T.cy - r} Z`
const laneR = (i) => T.RI + 7 + i * ((T.RO - T.RI - 14) / (HORSES.length - 1))

function racePlan(me, win) {
  const others = HORSES.map((_, i) => i).filter((i) => i !== me)
  const rival = pickOne(others)
  const curve = {}
  others.forEach((i) => { curve[i] = [0.86 + Math.random() * 0.08, Math.random() * 0.07 - 0.01] })
  if (win) {
    curve[me] = [1, -0.015]
    curve[rival] = [0.985, 0.08]
  } else {
    curve[me] = [0.985, 0.09]
    curve[rival] = [1, -0.02]
  }
  return { rival, curve }
}
const posAt = ([e, b], t, i) => Math.max(0, 100 * (e * t + b * Math.sin(Math.PI * t) + 0.008 * Math.sin(t * 17 + i * 1.3) * Math.sin(Math.PI * t)))

// 오른쪽을 보고 달리는 말 + 기수 (가운데가 0,0)
// 다리 4개: 엉덩이(위쪽 끝)를 축으로 앞뒤로 흔들어 달리는 모습을 만든다.
// 뒷다리 두 개, 앞다리 두 개가 서로 엇갈리게 움직인다 (갤럽).
const LEGS = [
  { d: 'M-7 1.5 L-8.5 8.5', cls: 'is-back-a' },
  { d: 'M-4 2.5 L-3.5 8.8', cls: 'is-back-b' },
  { d: 'M5 2.5 L4.5 8.8', cls: 'is-front-a' },
  { d: 'M7.5 1.5 L9 8.4', cls: 'is-front-b' },
]

function HorseFigure({ coat, silk, no, running, speed = 1 }) {
  const hoof = '#20140b'
  return (
    <g className={`g-horsefig ${running ? 'is-running' : ''}`} style={{ '--gait': `${0.42 / speed}s` }}>
      <path className="g-tail" d="M-11 -2 Q-16 1 -14 7" fill="none" stroke={coat} strokeWidth="2.4" strokeLinecap="round" />
      {LEGS.map((l) => <path key={l.cls} className={`g-leg ${l.cls}`} d={l.d} stroke={hoof} strokeWidth="1.9" strokeLinecap="round" />)}
      <g className="g-horse-body">
      <ellipse cx="-1" cy="0" rx="9.5" ry="4.6" fill={coat} stroke="#120a05" strokeWidth=".6" />
      <path d="M5 -2.5 L9.5 -8.5 L13.5 -9.6 L16 -7.4 L15 -5.6 L11.5 -5.2 L9 0.5 Z" fill={coat} stroke="#120a05" strokeWidth=".6" />
      <path d="M10.5 -8.6 L11 -11.4 L12.2 -9" fill={coat} stroke="#120a05" strokeWidth=".5" />
      <path d="M6 -3 L9.6 -8.2" stroke="#120a05" strokeWidth="1.1" />
      <rect x="-5.5" y="-3.6" width="7.5" height="6.4" rx="1" fill="#fff" stroke="#000" strokeWidth=".4" />
      <text x="-1.75" y="1.9" className="g-horse-no">{no}</text>
      <ellipse cx="0.5" cy="-7.4" rx="3.1" ry="3.4" fill={silk} stroke="#000" strokeWidth=".5" />
      <path d="M2.6 -7 L6.4 -4.6" stroke={silk} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.6" cy="-11.4" r="2.3" fill={silk} stroke="#000" strokeWidth=".5" />
      <path d="M3.6 -12.4 L6 -11.6" stroke="#000" strokeWidth=".9" />
      </g>
    </g>
  )
}

function RaceBoard({ pos, pick, ranking, done, running }) {
  const cells = Array.from({ length: CELLS }, (_, k) => k)
  return (
    <svg className="g-race" viewBox="0 0 360 244" role="img" aria-label="경마 트랙">
      <rect x="0" y="0" width="360" height="244" rx="10" className="g-race-grass" />
      <path d={stadium(T.RO + 3)} className="g-race-rail-out" />
      <path d={`${stadium(T.RO)} ${stadium(T.RI)}`} fillRule="evenodd" className="g-race-dirt" />
      {cells.map((k) => {
        const d = (k / CELLS) * LAP
        const [ax, ay] = trackPoint(d, T.RI)
        const [bx, by] = trackPoint(d, T.RO)
        const [nx, ny] = trackPoint(d + LAP / CELLS / 2, T.RO - 8)
        return (
          <g key={k}>
            <line x1={ax} y1={ay} x2={bx} y2={by} className={k === 0 ? 'g-race-start' : 'g-race-cell'} />
            <text x={nx} y={ny + 2.4} className="g-race-num">{k + 1}</text>
          </g>
        )
      })}
      <path d={stadium(T.RI)} className="g-race-infield" />
      <path d={stadium(T.RI - 8)} className="g-race-hedge" />
      {/* 출발·결승선 */}
      {Array.from({ length: 8 }, (_, k) => (
        <rect key={k} x={T.x1 - 3 + (k % 2) * 3} y={T.cy - T.RO + k * 6} width="3" height="6" fill={k % 2 ? '#111' : '#fff'} />
      ))}
      {/* 가운데 순위판 */}
      <rect x="122" y="84" width="116" height="76" rx="6" className="g-race-board" />
      <text x="180" y="97" className="g-race-board-title">{done ? '최종 순위' : 'LIVE 순위'}</text>
      {ranking.slice(0, 4).map((k, r) => (
        <g key={k} transform={`translate(130 ${111 + r * 13})`}>
          <rect x="0" y="-8" width="10" height="10" rx="2" fill={HORSES[k].silk} stroke="#000" strokeWidth=".6" />
          <text x="14" y="0" className={`g-race-board-row ${pick === k ? 'is-mine' : ''}`}>{r + 1}위 {k + 1}번 {HORSES[k].name}</text>
        </g>
      ))}
      {/* 말 피규어: 달리는 방향을 바라본다 */}
      {HORSES.map((h, i) => {
        const d = (Math.min(pos[i], 100) / 100) * LAP * 0.999
        const r = laneR(i)
        const [x, y] = trackPoint(d, r)
        const [x2, y2] = trackPoint(d + 2, r)
        // 기울이지 않고 똑바로 세운 채, 왼쪽으로 달릴 때만 좌우를 뒤집는다
        const turn = x2 - x < -0.05 ? 'scale(-1 1)' : ''
        void y2
        return (
          <g key={h.name} transform={`translate(${x} ${y})`} className={`g-piece ${pick === i ? 'is-mine' : ''}`}>
            <ellipse cx="0" cy="5" rx="11" ry="3.2" className="g-piece-shadow" />
            {pick === i && <ellipse cx="0" cy="4" rx="14" ry="6" className="g-piece-ring" />}
            <g transform={`${turn} scale(.82)`}>
              <HorseFigure coat={h.coat} silk={h.silk} no={i + 1} running={running && pos[i] < 100} speed={0.9 + (i % 3) * 0.08} />
            </g>
          </g>
        )
      })}
    </svg>
  )
}

export function HorseGame({ win, onStart, onDone, onTimeout, disabled }) {
  const [pick, setPick] = useState(null)
  const [left, setLeft] = useState(BET_DEADLINE)
  const [pos, setPos] = useState(HORSES.map(() => 0))
  const [call, setCall] = useState('말들이 출발 게이트에 들어가는 중')
  const [order, setOrder] = useState(null)
  const timers = useTimers()

  useEffect(() => {
    if (pick !== null || disabled) return undefined
    if (left <= 0) {
      onTimeout?.()
      return undefined
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left, pick, disabled, onTimeout])

  function choose(i) {
    if (pick !== null || disabled) return
    setPick(i)
    onStart()
    const { rival, curve } = racePlan(i, win)
    const started = Date.now()
    const total = reduced() ? 1 : RACE_MS
    setCall('출발! 게이트가 열렸어요')
    const tick = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / total)
      const now = HORSES.map((_, k) => Math.min(100, posAt(curve[k], t, k)))
      setPos(now)
      const ranked = now.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]).map(([, k]) => k)
      if (t > 0.1 && t < 0.88) setCall(`${ranked[0] + 1}번 ${HORSES[ranked[0]].name} 선두! ${ranked[1] + 1}번 ${HORSES[ranked[1]].name} 바짝 추격`)
      if (t >= 0.88 && t < 1) setCall('마지막 코너를 돌아 결승선 앞! 접전이에요!')
      if (t >= 1) {
        clearInterval(tick)
        const winner = win ? i : rival
        const final = [winner, ...ranked.filter((k) => k !== winner)]
        setOrder(final)
        setCall(win ? `사진 판정 결과 ${i + 1}번 ${HORSES[i].name} 우승!` : `사진 판정 결과 ${rival + 1}번 ${HORSES[rival].name} 우승 · 내 말은 코 차이 2위`)
        onDone(win, win ? null : `내 말(${i + 1}번 ${HORSES[i].name})이 내내 1등으로 달리다가 결승선 바로 앞에서 코 차이로 졌어요`)
      }
    }, 50)
    timers.current.push(tick)
  }

  const live = pos.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]).map(([, k]) => k)
  const ranking = order ?? live

  return (
    <div className="g-horse">
      <div className="g-race-info">
        <span>제7경주 · 1바퀴 · 7마리</span>
        {pick === null ? <b className={left <= 5 ? 'is-hurry' : ''}>발매 마감 00:{String(left).padStart(2, '0')}</b> : <b>{order ? '경주 종료' : '경주 중'}</b>}
      </div>
      <RaceBoard pos={pos} pick={pick} ranking={ranking} done={!!order} running={pick !== null && !order} />
      <p className="g-call" aria-live="polite">{call}</p>
      {pick === null && (
        <div className="g-horse-picks">
          {HORSES.map((h, i) => (
            <button key={h.name} type="button" className="g-horse-pick" onClick={() => choose(i)} disabled={disabled}>
              <span className={`g-silk ${i === 4 ? 'is-light' : ''}`} style={{ background: h.silk }}>{i + 1}</span>
              <b>{h.name}</b>
              <span className="g-odds">단승 ×2</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ======================= 슬롯머신 ======================= */
// 딸 듯 말 듯: 지는 판은 7·7이 맞고, 마지막 릴이 느려지다가 7이 줄 바로 위에서 멈춘다.

const SYMBOLS = ['7', 'BAR', '★', '♦', '♥', '♣']
const SYM_LABEL = { '7': '7', BAR: 'BAR', '★': '별', '♥': '하트', '♣': '클로버', '♦': '다이아' }
const LOOP = ['7', '♥', 'BAR', '★', '♣', '♦', '7', '★', '♥', 'BAR', '♦', '♣']
const STOP_MS = [1300, 2100, 3900] // 마지막 릴은 2.1초부터 천천히 돌다 멈춘다
const IDLE = [['♥', '7', '★'], ['♦', 'BAR', '♣'], ['★', '♣', '7']]

function Reel({ phase, symbols }) {
  if (phase === 'spin' || phase === 'slow') {
    return (
      <div className={`g-reel is-${phase}`}>
        <div className="g-loop">{[...LOOP, ...LOOP].map((s, k) => <span key={k} className={`g-sym s-${SYMBOLS.indexOf(s)}`}>{s}</span>)}</div>
      </div>
    )
  }
  return (
    <div className={`g-reel ${phase === 'stop' ? 'is-stop' : ''}`}>
      <div className="g-stack">
        {symbols.map((s, k) => <span key={k} className={`g-sym s-${SYMBOLS.indexOf(s)} ${k === 1 ? 'is-line' : ''}`} aria-label={SYM_LABEL[s]}>{s}</span>)}
      </div>
    </div>
  )
}

export function SlotGame({ win, onStart, onDone, disabled }) {
  const [phases, setPhases] = useState(['idle', 'idle', 'idle']) // idle | spin | slow | stop
  const [shown, setShown] = useState(IDLE)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(null)
  const timers = useTimers()
  const started = phases.some((p) => p !== 'idle')

  function spin() {
    if (started || disabled) return
    onStart()
    const final = win
      ? [['♥', '7', '★'], ['♦', '7', 'BAR'], ['♣', '7', '♥']]
      : [['♥', '7', '★'], ['♦', '7', 'BAR'], ['7', '♣', '★']]
    setShown(final)
    setPhases(['spin', 'spin', 'spin'])
    setMsg('돌아가는 중…')
    const fast = reduced()
    const set = (k, v) => setPhases((cur) => cur.map((p, j) => (j === k ? v : p)))
    STOP_MS.forEach((ms, k) => {
      timers.current.push(setTimeout(() => {
        set(k, 'stop')
        if (k === 1) { set(2, 'slow'); setMsg('7 · 7 … 마지막 릴!') }
        if (k === 2) {
          setDone(win)
          setMsg(win ? '7 7 7 당첨!' : '아깝다! 7이 한 칸 위에서 멈췄어요')
          onDone(win, win ? null : '7, 7까지 맞고 마지막 릴의 7이 한 칸 위에서 멈췄어요')
        }
      }, fast ? 30 * (k + 1) : ms))
    })
  }

  return (
    <div className="g-slot">
      <div className={`g-slot-machine ${done === true ? 'is-win' : ''}`}>
        <div className="g-slot-lights" aria-hidden="true">{Array.from({ length: 11 }, (_, k) => <i key={k} />)}</div>
        <div className="g-slot-top"><span>LUCKY</span><b>777</b></div>
        <div className="g-slot-body">
          <div className="g-slot-window">
            {phases.map((p, k) => <Reel key={k} phase={p} symbols={p === 'idle' ? IDLE[k] : shown[k]} />)}
            <span className="g-payline" aria-hidden="true" />
          </div>
          <button type="button" className={`g-lever ${started ? 'is-pulled' : ''}`} onClick={spin} disabled={started || disabled} aria-label="레버 당기기">
            <i />
          </button>
        </div>
        <p className="g-slot-msg" aria-live="polite">{msg || '가운데 줄에 같은 그림 3개면 ×2'}</p>
        <div className="g-paytable" aria-label="배당표">
          <span><b className="s-0">7 7 7</b> ×2</span>
          <span><b>BAR ×3</b> ×2</span>
          <span><b className="s-3">♦ ♦ ♦</b> ×2</span>
        </div>
      </div>
      {!started && <button type="button" className="g-big g-go" onClick={spin} disabled={disabled}>SPIN · 레버 당기기</button>}
    </div>
  )
}
