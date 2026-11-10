// 체험 각본: 모든 결과는 여기서 미리 정해진다. (docs/PRD.md T1~T10, G1~G5)
// 화면의 금액은 모두 가상 머니다. 실제 돈·결제·계좌는 없다.

export const START_MONEY = 100000
export const MAX_ROUNDS = 5 // 5판을 해야 출금 버튼이 열린다
export const LOW_BETS = [10000, 20000, 30000] // 1~5판
export const HIGH_BETS = [50000, 100000, 200000] // 6판부터: 판돈을 키우게 한다
export const PAYOUT = 2 // 이기면 건 돈의 2배를 준다
export const INVITE_AFTER_ROUND = 3
export const PROCESS_MS = 4000 // 출금이 정상으로 처리되는 것처럼 보이는 시간
export const ERROR_MS = 2500 // 인터넷 오류 화면 뒤 사이트가 사라지기까지

export const WITHDRAW_RULE = '5판 이상 해야 출금할 수 있습니다.'

// 각본
// 1~5판: 4판만 아깝게 지고 나머지는 이긴다. → 돈이 불어나는 것을 보여 준다.
// 6판부터: 판돈을 키우게 하고, 어떤 게임을 해도 진다. → 결국 0원.
// 5판 뒤 출금을 누르면: 정상 출금처럼 진행되다가 4초 뒤 인터넷 오류 → 사이트가 사라진다. 받은 돈은 0원.
const LOSE_ROUNDS = [4]
export const phaseOf = (round) => (round <= MAX_ROUNDS ? 'normal' : 'high')
export const winOf = (round) => phaseOf(round) === 'normal' && !LOSE_ROUNDS.includes(round)
export const betsOf = (round) => (phaseOf(round) === 'normal' ? LOW_BETS : HIGH_BETS)

export const GAMES = [
  { id: 'roulette', code: 'G1', name: '룰렛', desc: '공이 빨강에 떨어질지, 검정에 떨어질지 맞혀요.', secret: '공이 떨어질 칸은 돌리기 전에 이미 정해져 있었어요.' },
  { id: 'dice', code: 'G2', name: '주사위 홀짝', desc: '주사위 세 개를 더한 수가 홀인지 짝인지 맞혀요.', secret: '"짝이 계속 나왔으니 이번엔 홀"이라는 착각을 노렸어요. 컵 속 주사위 눈은 사이트가 정해요.' },
  { id: 'horse', code: 'G3', name: '경마', desc: '말 7마리 중 1등으로 들어올 말을 골라요.', secret: '내 말이 앞서 달리다가 결승선 바로 앞에서 지는 장면까지 미리 짜여 있었어요.' },
  { id: 'slot', code: 'G4', name: '슬롯머신', desc: '가운데 줄에 같은 그림 3개가 나오면 이겨요.', secret: '"한 칸만 더 갔으면!" 싶은 위치에 일부러 멈추게 했어요.' },
]
export const gameById = (id) => GAMES.find((g) => g.id === id)

export const TRICKS = [
  { id: 'T1', name: '처음엔 이기게 해 주기', explain: '처음 몇 판을 따게 해서 "나는 된다"고 믿게 만들어요. 이기고 지는 것은 사이트 서버가 정해요.', avoid: '첫 판에 땄다면 그게 미끼예요.' },
  { id: 'T3', name: '아깝게 진 것처럼 보이기', explain: '"한 끗 차이!" 같은 장면은 연출이에요. 거의 이길 뻔했다는 느낌이 들면 다음 판을 하게 돼요.', avoid: '"다음엔 된다"는 느낌이 바로 수법이에요.' },
  { id: 'T4', name: '가짜 당첨 소식', explain: '"김**님 3,000,000원 당첨" 같은 소식은 지어낸 문구예요. 남들은 딴다고 착각하게 만들어요.', avoid: '확인할 수 없는 말은 믿지 마세요.' },
  { id: 'T5', name: '출금 조건 걸기', explain: '"5판 이상 해야 출금" 같은 조건을 걸어요. 조건을 채우려고 계속 하게 만드는 장치예요. 불법이라 어디에 하소연할 수도 없어요.', avoid: '조건이 붙는 순간 그 돈은 이미 내 돈이 아니에요.' },
  { id: 'T6', name: '시간에 쫓기게 하기', explain: '"발매 마감 15초 전" 같은 타이머로 생각할 시간을 빼앗아 급하게 결정하게 만들어요.', avoid: '서두르게 하는 곳은 피하세요.' },
  { id: 'T7', name: '가입할 때 개인정보·계좌 요구', explain: '넘긴 개인정보와 계좌는 협박이나 사기 같은 다른 범죄에 쓰일 수 있어요. 계좌를 빌려주면 나도 처벌받을 수 있어요.', avoid: '신분증·계좌는 절대 넘기지 마세요.' },
  { id: 'T8', name: '친구 초대하면 보상', explain: '친구를 끌어들이게 해서 피해자를 늘려요. 나도 모르게 친구를 끌어들인 사람이 돼요.', avoid: '거절하는 게 친구를 지키는 거예요.' },
  { id: 'T9', name: '판돈 키우게 하기', explain: '어느 정도 따고 나면 "크게 걸면 크게 딴다"며 판돈을 올리게 해요. 판돈이 커진 뒤부터는 계속 지게 만들어요.', avoid: '판돈이 커지라고 부추기면 바로 멈추세요.' },
  { id: 'T10', name: '출금하면 사이트 닫고 도망가기', explain: '출금이 되는 것처럼 보여 주다가 "인터넷 오류" 같은 핑계로 시간을 끌고 사이트를 닫고 사라져요. 운영자는 회원들이 넣은 돈을 들고 잠적하고, 불법이라 돌려받을 방법이 거의 없어요.', avoid: '불법 사이트에서 딴 돈은 내 돈이 아니에요.' },
]

export const FEED = [
  '김**님 룰렛 3,000,000원 당첨',
  '박**님 1,200,000원 출금 완료',
  '이**님 주사위 홀짝 7연승',
  '한**님 경마 3번 은하수 우승 적중',
  '윤**님 슬롯 777 잭팟',
]

// 정답 공개 전 "수상했던 장면 고르기". decoy는 실제로 없던 장면.
export const QUIZ = [
  { id: 'T7', text: '가입할 때 계좌번호와 신분증을 달라고 했다' },
  { id: 'T1', text: '처음 몇 판을 계속 이겼다' },
  { id: 'D1', text: '게임 규칙과 이길 확률을 자세히 알려 줬다', decoy: true },
  { id: 'T6', text: '시간이 얼마 안 남았다며 서두르게 했다' },
  { id: 'T3', text: '거의 이길 뻔하다가 아깝게 졌다' },
  { id: 'T4', text: '다른 사람이 큰돈을 땄다는 소식이 계속 보였다' },
  { id: 'D2', text: '출금하기를 누르면 바로 돈을 내줬다', decoy: true },
  { id: 'T8', text: '친구를 데려오면 돈을 준다고 했다' },
  { id: 'T5', text: '출금하려니 "5판 이상 해야 한다"고 했다' },
  { id: 'T9', text: '5판이 지나자 더 큰 돈을 걸게 했다' },
  { id: 'T10', text: '출금이 되는 듯하다가 인터넷 오류가 나고 사이트가 사라졌다' },
]

export const BEFORE_AFTER_QUESTION = '불법 도박으로 돈을 벌 수 있다고 생각하나요?'
export const ANSWERS = ['그렇다', '모르겠다', '아니다']
