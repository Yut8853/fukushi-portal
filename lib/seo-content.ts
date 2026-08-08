export type SeoCategoryContent = {
  searchTitle: string;
  summary: string;
  firstAction: string;
  relatedTerms: string[];
  firstSteps?: string[];
  supportOptions?: { title: string; description: string; guideSlug?: string }[];
  whatToPrepare?: string[];
  relatedCases?: { label: string; categoryId: string; description: string }[];
};

const CONTENT: Record<string, SeoCategoryContent> = {
  food: {
    searchTitle: "食べるものがない・食費がない",
    summary:
      "今日や数日以内の食事に困っているときは、食料支援だけでなく、生活全体を一緒に整理できる窓口へ相談できます。",
    firstAction: "手元にお金や書類がなくても、まず「今日食べるものに困っている」と伝えてください。",
    relatedTerms: ["食料支援", "フードバンク", "生活困窮相談"],
    firstSteps: [
      "今日食べるものがない場合は、その緊急性を自立相談支援機関や福祉事務所へ伝える",
      "食料だけでなく、所持金・住まい・今後の収入についてもまとめて相談する",
      "閉庁後の場合は、自治体の代表電話で時間外に利用できる支援があるか確認する",
    ],
    supportOptions: [
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description:
          "食料、住まい、家計、仕事など複数の困りごとを整理し、地域の支援につなぐ相談窓口です。",
      },
      {
        title: "地域の食料支援",
        description:
          "自治体、社会福祉協議会、フードバンクなどが食料を提供している場合があります。実施状況や条件は地域で異なります。",
      },
      {
        title: "生活保護",
        guideSlug: "seikatsu-hogo",
        description:
          "収入や資産だけでは生活できず、食事を含む最低限度の生活を維持できない場合に相談・申請できます。",
      },
    ],
    whatToPrepare: [
      "現在の所持金",
      "最後に食事をした時期",
      "本人確認書類（あれば）",
      "収入や住まいの状況が分かるもの（あれば）",
    ],
    relatedCases: [
      {
        label: "生活費も残っていない",
        categoryId: "money",
        description: "生活費や生活保護の相談先を探す",
      },
      {
        label: "今夜泊まる場所もない",
        categoryId: "housing",
        description: "一時的な住まいの相談先を探す",
      },
      { label: "家賃も払えない", categoryId: "rent", description: "家賃や退去の相談先を探す" },
    ],
  },
  housing: {
    searchTitle: "今夜泊まる場所がない・家を失った",
    summary: "今夜の安全な居場所がないときや、住まいを失ったときに相談できる地域窓口を案内します。",
    firstAction: "今夜泊まれる場所がない場合は、そのことを最初に伝えてください。",
    relatedTerms: ["一時宿泊", "住まいの相談", "生活困窮相談"],
    firstSteps: [
      "今夜安全に泊まれる場所がないことを自立相談支援機関や福祉事務所へ伝える",
      "暴力や犯罪から逃げている場合は安全を優先し、110番や専門窓口へ相談する",
      "所持金、現在地、今夜以降の見通しを伝える",
    ],
    supportOptions: [
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description: "一時的な住まい、生活費、仕事などをまとめて相談できる地域の入口です。",
      },
      {
        title: "一時生活支援事業など",
        description:
          "一定の住居がない方へ、地域の実施状況に応じて宿泊場所や衣食を提供する支援があります。",
      },
      {
        title: "生活保護",
        guideSlug: "seikatsu-hogo",
        description:
          "住まいがない場合も福祉事務所へ相談・申請できます。現在地や生活状況を伝えてください。",
      },
    ],
    whatToPrepare: [
      "現在いる場所と連絡方法",
      "今夜泊まれる場所の有無",
      "所持金",
      "本人確認書類（あれば）",
    ],
    relatedCases: [
      {
        label: "今日食べるものもない",
        categoryId: "food",
        description: "緊急の食料支援を相談する",
      },
      { label: "生活費がない", categoryId: "money", description: "暮らし全体の支援を相談する" },
      {
        label: "家族や同居人から逃げたい",
        categoryId: "violence",
        description: "安全を優先した相談先を確認する",
      },
    ],
  },
  rent: {
    searchTitle: "家賃が払えない・滞納している",
    summary: "家賃の支払いが難しい、退去を求められそう、住まいを失う不安があるときの相談先です。",
    firstAction:
      "督促状や賃貸借契約書が手元になくても相談できます。退去期限があれば先に伝えてください。",
    relatedTerms: ["家賃滞納", "住居確保給付金", "退去相談"],
    firstSteps: [
      "退去期限、督促状、裁判所からの書類がある場合は期限を確認する",
      "自治体の自立相談支援機関へ、家賃と収入の状況を相談する",
      "大家や管理会社にも、支払時期や分割について早めに相談する",
    ],
    supportOptions: [
      {
        title: "住居確保給付金",
        guideSlug: "jukyo-kakuho-kyufukin",
        description:
          "離職や収入減少などの要件を満たす場合に、家賃相当額や対象となる転居費用が支給される制度です。",
      },
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description: "家賃だけでなく、仕事、家計、住まいの確保をまとめて相談できます。",
      },
      {
        title: "生活保護",
        guideSlug: "seikatsu-hogo",
        description:
          "収入や資産だけでは生活できず、家賃を含む最低限度の生活を維持できない場合に相談・申請できます。",
      },
    ],
    whatToPrepare: [
      "賃貸借契約書",
      "家賃の督促状や退去に関する書類",
      "収入・預貯金が分かるもの",
      "本人確認書類",
    ],
    relatedCases: [
      {
        label: "今夜泊まる場所がない",
        categoryId: "housing",
        description: "緊急の住まいを相談する",
      },
      {
        label: "生活費も残っていない",
        categoryId: "money",
        description: "暮らし全体の支援を相談する",
      },
      {
        label: "電気や水道も止まりそう",
        categoryId: "utilities",
        description: "公共料金の相談先を確認する",
      },
    ],
  },
  utilities: {
    searchTitle: "電気・ガス・水道が止まりそう",
    summary:
      "公共料金を払えないときは、電気・ガス会社への支払い相談と、水道料金を扱う自治体・水道局への相談で連絡先が異なります。",
    firstAction: "停止予定日が書かれた通知があれば、その日を最初に伝えてください。",
    relatedTerms: ["電気代が払えない", "ガス代滞納", "水道料金相談"],
    firstSteps: [
      "停止予定日を確認し、電気・ガス会社または水道局へ支払い相談をする",
      "生活費全体が足りない場合は、自治体の自立相談支援機関にも相談する",
      "すでに止まっていて健康や生命に影響する場合は、その事情を最初に伝える",
    ],
    supportOptions: [
      {
        title: "料金事業者への支払い相談",
        description:
          "支払期限、分割、再開条件などを相談できる場合があります。契約先へ直接確認してください。",
      },
      {
        title: "自治体・水道局の相談",
        description: "水道料金の相談先や利用できる減免制度は自治体・水道事業者によって異なります。",
      },
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description: "公共料金だけでなく、家計、住まい、仕事など生活全体を整理できます。",
      },
    ],
    whatToPrepare: [
      "停止予定日が分かる通知",
      "契約者番号やお客さま番号",
      "請求額が分かるもの",
      "支払える時期や金額の見込み",
    ],
    relatedCases: [
      {
        label: "生活費そのものがない",
        categoryId: "money",
        description: "公的支援を含めて相談する",
      },
      { label: "家賃も滞納している", categoryId: "rent", description: "住まいを失う前に相談する" },
      {
        label: "病気や医療機器への影響がある",
        categoryId: "medical",
        description: "医療費や受診について相談する",
      },
    ],
  },
  money: {
    searchTitle: "生活費がない・お金がなく生活できない",
    summary:
      "生活費が尽きた、収入がなく暮らせないときに、生活保護や生活困窮相談へつながる窓口を案内します。",
    firstAction:
      "所持金が少ない、食事や住まいにも困っている場合は、その緊急性を最初に伝えてください。",
    relatedTerms: ["生活保護相談", "生活費がない", "公的支援"],
    firstSteps: [
      "所持金、食事、住まいなど、今日困っていることを整理する",
      "自治体の自立相談支援機関または福祉事務所へ連絡する",
      "生活保護を申請したい場合は、相談だけでなく申請意思を明確に伝える",
    ],
    supportOptions: [
      {
        title: "生活保護",
        guideSlug: "seikatsu-hogo",
        description:
          "収入や資産だけでは最低限度の生活を維持できない場合に、福祉事務所へ相談・申請できる制度です。",
      },
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description:
          "生活費、住まい、家計、仕事などを支援員と整理し、必要な制度や窓口につなぎます。",
      },
      {
        title: "生活福祉資金貸付制度",
        guideSlug: "seikatsu-fukushi-shikin",
        description:
          "低所得世帯など一定の要件を満たす世帯を対象とする貸付制度です。審査があり、原則として返済が必要です。",
      },
      {
        title: "年金生活者支援給付金",
        guideSlug: "nenkin-seikatsusha-shien-kyufukin",
        description:
          "所得が一定基準以下の基礎年金受給者へ、要件を満たす場合に年金へ上乗せして支給される給付です。",
      },
    ],
    whatToPrepare: [
      "現在の所持金と預貯金",
      "収入が分かるもの",
      "家賃・公共料金などの請求書",
      "本人確認書類（なくてもまず相談できます）",
    ],
    relatedCases: [
      {
        label: "今日食べるものがない",
        categoryId: "food",
        description: "緊急の食料支援を相談する",
      },
      { label: "家賃を払えない", categoryId: "rent", description: "住居確保給付金などを確認する" },
      {
        label: "仕事を失った・働けない",
        categoryId: "work",
        description: "収入と就労の支援を相談する",
      },
    ],
  },
  medical: {
    searchTitle: "病院に行くお金がない・医療費が払えない",
    summary:
      "受診費用や保険料、医療費の支払いが難しいときに利用できる可能性がある相談先を案内します。",
    firstAction:
      "強い痛みや呼吸困難など緊急性がある場合は、相談窓口ではなく119番を利用してください。",
    relatedTerms: ["医療費相談", "無料低額診療", "国民健康保険"],
    firstSteps: [
      "強い痛み、呼吸困難、意識の異常など緊急性がある場合は119番を利用する",
      "受診予定の医療機関へ、支払いが難しいことを受診前に相談する",
      "加入している医療保険または自治体へ、利用できる制度を確認する",
    ],
    supportOptions: [
      {
        title: "無料低額診療事業",
        description:
          "実施する医療機関が、経済的な理由で診療費の支払いが難しい方に無料または低額で診療を行う事業です。",
      },
      {
        title: "高額療養費制度",
        guideSlug: "kogaku-ryoyohi",
        description:
          "1か月の医療費の自己負担が年齢や所得に応じた上限を超えた場合に、超過分が支給される制度です。",
      },
      {
        title: "生活保護の医療扶助",
        description:
          "生活保護が決定された場合、必要な医療について医療扶助の対象となることがあります。まず福祉事務所へ相談してください。",
      },
    ],
    whatToPrepare: [
      "保険証または資格情報",
      "受診先・症状・受診予定日",
      "請求書や領収書",
      "収入や世帯状況が分かるもの（あれば）",
    ],
    relatedCases: [
      {
        label: "生活費も残っていない",
        categoryId: "money",
        description: "暮らし全体の支援を相談する",
      },
      { label: "病気で働けない", categoryId: "work", description: "傷病手当金などを確認する" },
      {
        label: "心や体が限界に近い",
        categoryId: "mental",
        description: "今使える相談方法を確認する",
      },
    ],
  },
  work: {
    searchTitle: "仕事を失った・働けない",
    summary: "失業、休職、病気などで働けず、収入や生活に困っているときの地域の総合相談窓口です。",
    firstAction: "仕事だけでなく家賃や生活費にも困っている場合は、まとめて伝えて大丈夫です。",
    relatedTerms: ["失業相談", "就労支援", "生活困窮相談"],
    firstSteps: [
      "雇用保険、健康保険、勤務先との雇用関係がどうなっているか確認する",
      "ハローワークで失業給付や求職者支援制度について相談する",
      "当面の生活費や家賃にも困る場合は、自立相談支援機関へ同時に相談する",
    ],
    supportOptions: [
      {
        title: "雇用保険の基本手当",
        description:
          "離職理由、加入期間、求職活動などの要件を満たす場合に受給できる可能性があります。ハローワークへ確認してください。",
      },
      {
        title: "求職者支援制度",
        guideSlug: "kyushokusha-shien",
        description:
          "雇用保険を受給できない求職者などが、要件を満たす場合に給付金を受けながら無料の職業訓練を受けられる制度です。",
      },
      {
        title: "傷病手当金",
        guideSlug: "shobyo-teatekin",
        description:
          "勤務先の健康保険に加入する方が業務外の病気やけがで働けず、給与を受けられない場合に対象となることがあります。",
      },
    ],
    whatToPrepare: [
      "離職票や雇用契約書（あれば）",
      "健康保険・雇用保険の情報",
      "給与明細",
      "医師の証明や診断書（病気やけがの場合）",
    ],
    relatedCases: [
      {
        label: "当面の生活費がない",
        categoryId: "money",
        description: "生活費の公的支援を相談する",
      },
      { label: "家賃を払えない", categoryId: "rent", description: "住まいを失う前に相談する" },
      {
        label: "病院に行くお金がない",
        categoryId: "medical",
        description: "医療費の制度を確認する",
      },
    ],
  },
  debt: {
    searchTitle: "借金を返せない・差し押さえが心配",
    summary:
      "借金、督促、給料や口座の差し押さえが心配なときに、生活と支払いを一緒に整理する入口です。",
    firstAction:
      "請求書が全部そろっていなくても相談できます。裁判所から届いた書類には期限があるため、その有無を伝えてください。",
    relatedTerms: ["借金相談", "督促", "債務整理"],
    firstSteps: [
      "裁判所、税務署、債権者から届いた書類の期限を確認する",
      "借入先、残高、毎月の返済額を分かる範囲で整理する",
      "法テラスや自治体の法律・多重債務相談へ連絡する",
    ],
    supportOptions: [
      {
        title: "民事法律扶助",
        guideSlug: "minji-horitsu-fujo",
        description:
          "収入・資産などの条件を満たす方が、無料法律相談や弁護士・司法書士費用の立替を利用できる制度です。",
      },
      {
        title: "家計改善支援",
        description: "家計を見える化し、滞納の整理や専門窓口への接続を支援します。",
      },
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description: "借金だけでなく、家賃、生活費、仕事をまとめて相談できます。",
      },
    ],
    whatToPrepare: [
      "督促状や裁判所からの書類",
      "借入先と残高が分かるもの",
      "収入と毎月の支出",
      "税金・家賃・公共料金の滞納状況",
    ],
    relatedCases: [
      {
        label: "生活費が残っていない",
        categoryId: "money",
        description: "公的支援を含めて相談する",
      },
      { label: "家賃を滞納している", categoryId: "rent", description: "住まいを失う前に相談する" },
      {
        label: "公共料金も止まりそう",
        categoryId: "utilities",
        description: "支払いと生活全体を相談する",
      },
    ],
  },
  violence: {
    searchTitle: "DV・家族や同居人から逃げたい",
    summary:
      "家族や同居人からの暴力や支配から離れたいときの安全な相談先です。自治体の代表電話は表示しません。",
    firstAction:
      "画面を見られる危険がある場合は「すぐ閉じる」を使い、安全な端末から相談してください。",
    relatedTerms: ["DV相談", "避難相談", "配偶者暴力"],
  },
  children: {
    searchTitle: "子ども・妊娠・ひとり親の生活相談",
    summary: "子育て、妊娠、就学、ひとり親家庭の生活やお金に関する地域の相談入口です。",
    firstAction:
      "子どもの安全に差し迫った心配がある場合は、児童相談所虐待対応ダイヤル189へ相談できます。",
    relatedTerms: ["ひとり親支援", "子育て相談", "妊娠相談"],
    firstSteps: [
      "子どもの安全に差し迫った心配があれば189番または110番へ連絡する",
      "自治体の子育て・ひとり親・母子保健の担当窓口へ相談する",
      "生活費、学校、住まいなど重なっている困りごとも一緒に伝える",
    ],
    supportOptions: [
      {
        title: "児童扶養手当",
        guideSlug: "jido-fuyo-teate",
        description: "ひとり親家庭などで要件を満たす養育者へ支給される手当です。",
      },
      {
        title: "就学援助",
        guideSlug: "shugaku-enjo",
        description: "小中学校の学用品費や給食費などを市町村が援助する制度です。",
      },
      {
        title: "子ども家庭センターなど",
        description: "妊娠、子育て、家庭内の困りごとを継続して相談できる地域の窓口です。",
      },
    ],
    whatToPrepare: [
      "子どもの年齢と世帯状況",
      "困っている費用や期限",
      "学校・保育所からの書類",
      "収入や公的年金が分かるもの（手当相談の場合）",
    ],
    relatedCases: [
      { label: "生活費や食費がない", categoryId: "money", description: "世帯全体の支援を相談する" },
      { label: "家賃を払えない", categoryId: "rent", description: "住まいの支援を確認する" },
      {
        label: "家族からの暴力がある",
        categoryId: "violence",
        description: "安全な相談方法を確認する",
      },
    ],
  },
  mental: {
    searchTitle: "心や体が限界・消えたい",
    summary: "こころや体が限界に近いとき、電話だけでなくSNSやチャットを含む相談方法を案内します。",
    firstAction: "今すぐ自分や誰かを傷つける危険がある場合は、110番または119番を利用してください。",
    relatedTerms: ["こころの相談", "SNS相談", "生きづらさ"],
  },
  disability: {
    searchTitle: "障害や病気で暮らしに支援が必要",
    summary:
      "障害や病気による生活上の困りごと、福祉サービスや必要な手助けについて相談できる入口です。",
    firstAction: "診断名や制度名が分からなくても、生活で困っている場面を伝えれば大丈夫です。",
    relatedTerms: ["障害福祉相談", "発達相談", "生活支援"],
    firstSteps: [
      "生活で困っている具体的な場面を整理する",
      "自治体の障害福祉担当窓口または基幹相談支援センターなどへ相談する",
      "医療、仕事、生活費の困りごともまとめて伝える",
    ],
    supportOptions: [
      {
        title: "障害福祉サービス",
        description: "介護、訓練、就労、地域生活など、障害や生活状況に応じたサービスがあります。",
      },
      {
        title: "障害年金",
        guideSlug: "shogai-nenkin",
        description: "病気やけがで生活や仕事が制限され、要件を満たす場合に受け取れる公的年金です。",
      },
      {
        title: "自立支援医療",
        guideSlug: "jiritsu-shien-iryo",
        description: "対象となる継続的な医療費の自己負担を軽減する制度です。",
      },
    ],
    whatToPrepare: [
      "困っている場面のメモ",
      "診断書・障害者手帳・受給者証（あれば）",
      "通院先や服薬が分かるもの",
      "本人確認書類",
    ],
    relatedCases: [
      {
        label: "病院に行くお金がない",
        categoryId: "medical",
        description: "医療費の制度を確認する",
      },
      { label: "働けず収入がない", categoryId: "work", description: "仕事と所得保障を相談する" },
      { label: "生活費が足りない", categoryId: "money", description: "暮らし全体の支援を相談する" },
    ],
  },
  care: {
    searchTitle: "介護で生活や仕事が続けられない",
    summary:
      "本人や家族の介護で暮らしや仕事が難しくなったとき、介護保険や地域の支援へつながる相談入口です。",
    firstAction: "介護認定を受けていなくても、まず相談できます。",
    relatedTerms: ["介護相談", "地域包括支援センター", "介護保険"],
    firstSteps: [
      "本人の安全や介護する家族の限界が迫っている場合は、その緊急性を伝える",
      "地域包括支援センターまたは自治体の介護保険窓口へ相談する",
      "仕事を休む必要がある場合は勤務先にも早めに相談する",
    ],
    supportOptions: [
      {
        title: "介護保険サービス",
        description:
          "要介護認定などを経て、訪問・通所・短期入所などのサービスを利用できる可能性があります。",
      },
      {
        title: "地域包括支援センター",
        description:
          "高齢者本人と家族の介護、権利擁護、生活上の困りごとを相談できる地域の窓口です。",
      },
      {
        title: "介護休業給付金",
        guideSlug: "kaigo-kyugyo-kyufukin",
        description:
          "雇用保険に加入する方が介護休業を取得し、要件を満たす場合に支給される給付です。",
      },
    ],
    whatToPrepare: [
      "介護が必要な人の状態",
      "医療機関や現在のサービス",
      "困っている時間帯や介助内容",
      "勤務先・雇用保険の情報（休業相談の場合）",
    ],
    relatedCases: [
      {
        label: "介護で仕事を続けられない",
        categoryId: "work",
        description: "休業や収入の支援を確認する",
      },
      {
        label: "医療費を払えない",
        categoryId: "medical",
        description: "医療費の負担軽減を相談する",
      },
      { label: "生活費が足りない", categoryId: "money", description: "世帯全体の支援を相談する" },
    ],
  },
  unknown: {
    searchTitle: "どこに相談すればいいか分からない",
    summary:
      "困りごとが複数ある、制度名が分からない、どの窓口に話せばよいか分からないときの総合相談入口です。",
    firstAction: "うまく説明できなくても、「生活のことで困っている」と伝えるだけで大丈夫です。",
    relatedTerms: ["生活相談", "福祉相談", "生活困窮者自立相談"],
    firstSteps: [
      "今日または数日以内に困ることがあるかを伝える",
      "自治体の自立相談支援機関へ「何を選べばよいか分からない」と相談する",
      "食事、住まい、お金、仕事、家族など思い当たることを一つずつ話す",
    ],
    supportOptions: [
      {
        title: "生活困窮者自立相談支援",
        guideSlug: "seikatsu-konkyusha-jiritsu-shien",
        description: "制度名が分からなくても、複数の困りごとを支援員と整理できます。",
      },
      {
        title: "自治体の福祉総合相談",
        description: "担当部署が分からない場合の入口として、必要な窓口へ案内してもらえます。",
      },
      {
        title: "社会福祉協議会",
        description: "地域の福祉相談や生活福祉資金などについて相談できる場合があります。",
      },
    ],
    whatToPrepare: [
      "今日いちばん困っていること",
      "いつまでに対応が必要か",
      "連絡可能な方法",
      "手元に届いている通知や請求書（あれば）",
    ],
    relatedCases: [
      { label: "生活費がない", categoryId: "money", description: "お金と暮らしの支援を相談する" },
      {
        label: "今夜泊まる場所がない",
        categoryId: "housing",
        description: "緊急の住まいを相談する",
      },
      { label: "今日食べるものがない", categoryId: "food", description: "食料支援を相談する" },
    ],
  },
};

export function seoCategoryContent(categoryId: string): SeoCategoryContent {
  return CONTENT[categoryId] ?? CONTENT.unknown;
}
