/**
 * Lower-bound thresholds for each Indonesian net-wealth percentile in 2024.
 *
 * Source: World Inequality Database, `thwealj992` (net household wealth,
 * equal-split adults), current IDR. The values deliberately live in the app
 * rather than being fetched at runtime so the private figure never leaves the
 * device and the snapshot keeps working offline.
 * https://wid.world/data/
 */
const INDONESIA_WEALTH_THRESHOLDS_2024 = [
  -713289501, -188598880, -20966044, -6292396, -1547551,
  -495463, -432944, -398296, -321899, -198106,
  -117693, -61734, 52300, 154278, 275110,
  454185, 574980, 718702, 800549, 986983,
  1168789, 1697422, 2719009, 4093738, 5667310,
  7431995, 9636044, 12183694, 14716784, 17353708,
  20474068, 24126428, 28019880, 31491180, 35176876,
  39100964, 43092108, 47396064, 51716400, 56705808,
  63728166, 65095636, 70360540, 78043969, 80890347,
  86155251, 91420154, 96685058, 101949962, 107214865,
  112479769, 117744673, 123009576, 132501314, 135843328,
  145589559, 158964780, 165082021, 174828251, 184574482,
  194320713, 204066944, 213813175, 223559406, 233305637,
  243051867, 252798098, 262544329, 281262954, 298431078,
  316578895, 326721098, 333032752, 348218300, 363403848,
  378589396, 406750416, 419160816, 456642785, 469932560,
  495318432, 520704304, 564084662, 581170176, 640570166,
  672792471, 688614912, 741827136, 802273856, 863259328,
  931098560, 1012284672, 1103259392, 1222317568, 1372080000,
  1550969088, 1792319488, 2144966656, 2784865280, 3483401216
]

function wealthClass (percentile) {
  if (percentile >= 99) {
    return {
      key: 'top-one',
      label: 'Kelas kekayaan sangat atas',
      group: '1% teratas',
      range: 'P99+'
    }
  }
  if (percentile >= 90) {
    return {
      key: 'upper',
      label: 'Kelas kekayaan atas',
      group: '10% teratas',
      range: 'P90–P98'
    }
  }
  if (percentile >= 50) {
    return {
      key: 'middle',
      label: 'Kelas kekayaan menengah',
      group: '40% menengah',
      range: 'P50–P89'
    }
  }
  return {
    key: 'lower',
    label: 'Kelompok kekayaan bawah',
    group: '50% bawah',
    range: 'P0–P49'
  }
}

/**
 * Places a recorded net-worth figure at the nearest completed percentile.
 * P57 means the figure meets the P57 threshold but not yet P58.
 */
export function indonesiaWealthStanding (netWorth) {
  if (netWorth === null || netWorth === undefined || netWorth === '') return null
  const value = Number(netWorth)
  if (!Number.isFinite(value)) return null

  let percentile = 0
  for (let index = 1; index < INDONESIA_WEALTH_THRESHOLDS_2024.length; index += 1) {
    if (value < INDONESIA_WEALTH_THRESHOLDS_2024[index]) break
    percentile = index
  }

  return {
    percentile,
    percentileLabel: percentile >= 99 ? 'P99+' : `P${percentile}`,
    ...wealthClass(percentile)
  }
}
