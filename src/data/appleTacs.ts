/**
 * Well-known Apple TACs (eerste 8 IMEI-cijfers) voor iPhone 11–17.
 * Best-effort uit publieke TAC-lijsten, géén GSMA-officiële database.
 * Ontbrekende TAC → onbekend model.
 */
const GROUPS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    'iPhone 11',
    [
      '35332510',
      '35332610',
      '35332710',
      '35332810',
      '35332910',
      '35333010',
      '35671110',
      '35671210',
      '35671310',
      '35916310',
      '35916410',
      '35916510',
    ],
  ],
  [
    'iPhone 11 Pro',
    ['35332210', '35332410', '35670810', '35671010', '35916010', '35916210'],
  ],
  [
    'iPhone 11 Pro Max',
    ['35332110', '35332310', '35670710', '35670910', '35915910', '35916110'],
  ],
  [
    'iPhone 12 mini',
    ['35390911', '35391011', '35639511', '35639611', '35925011', '35925111'],
  ],
  [
    'iPhone 12',
    [
      '35391311',
      '35391411',
      '35391511',
      '35391611',
      '35639911',
      '35640011',
      '35925411',
      '35925511',
    ],
  ],
  [
    'iPhone 12 Pro',
    ['35391111', '35391211', '35639711', '35639811', '35925211', '35925311'],
  ],
  [
    'iPhone 12 Pro Max',
    ['35391711', '35391811', '35640111', '35640211', '35925611', '35925711'],
  ],
  [
    'iPhone 13 mini',
    ['35322012', '35322112', '35654812', '35654912', '35940612', '35940712'],
  ],
  [
    'iPhone 13',
    ['35322212', '35322312', '35655012', '35655112', '35940812', '35940912'],
  ],
  [
    'iPhone 13 Pro',
    [
      '35321812',
      '35321912',
      '35385618',
      '35654612',
      '35654712',
      '35940412',
      '35940512',
    ],
  ],
  [
    'iPhone 13 Pro Max',
    ['35321612', '35321712', '35654412', '35654512', '35940212', '35940312'],
  ],
  ['iPhone 14 Pro', ['35695917']],
]

const TAC_TO_MODEL: Record<string, string> = {}
for (const [model, tacs] of GROUPS) {
  for (const tac of tacs) TAC_TO_MODEL[tac] = model
}

/** Schatting: bekend TAC → marketingnaam. Anders null. */
export function appleModelHint(tac: string): string | null {
  return TAC_TO_MODEL[tac] ?? null
}
