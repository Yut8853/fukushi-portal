export type SeoCategoryContent = {
  searchTitle: string;
  summary: string;
  firstAction: string;
  relatedTerms: string[];
};

const CONTENT: Record<string, SeoCategoryContent> = {
  food: {
    searchTitle: "食べるものがない・食費がない",
    summary:
      "今日や数日以内の食事に困っているときは、食料支援だけでなく、生活全体を一緒に整理できる窓口へ相談できます。",
    firstAction: "手元にお金や書類がなくても、まず「今日食べるものに困っている」と伝えてください。",
    relatedTerms: ["食料支援", "フードバンク", "生活困窮相談"],
  },
  housing: {
    searchTitle: "今夜泊まる場所がない・家を失った",
    summary: "今夜の安全な居場所がないときや、住まいを失ったときに相談できる地域窓口を案内します。",
    firstAction: "今夜泊まれる場所がない場合は、そのことを最初に伝えてください。",
    relatedTerms: ["一時宿泊", "住まいの相談", "生活困窮相談"],
  },
  rent: {
    searchTitle: "家賃が払えない・滞納している",
    summary: "家賃の支払いが難しい、退去を求められそう、住まいを失う不安があるときの相談先です。",
    firstAction:
      "督促状や賃貸借契約書が手元になくても相談できます。退去期限があれば先に伝えてください。",
    relatedTerms: ["家賃滞納", "住居確保給付金", "退去相談"],
  },
  utilities: {
    searchTitle: "電気・ガス・水道が止まりそう",
    summary:
      "公共料金を払えないときは、電気・ガス会社への支払い相談と、水道料金を扱う自治体・水道局への相談で連絡先が異なります。",
    firstAction: "停止予定日が書かれた通知があれば、その日を最初に伝えてください。",
    relatedTerms: ["電気代が払えない", "ガス代滞納", "水道料金相談"],
  },
  money: {
    searchTitle: "生活費がない・お金がなく生活できない",
    summary:
      "生活費が尽きた、収入がなく暮らせないときに、生活保護や生活困窮相談へつながる窓口を案内します。",
    firstAction:
      "所持金が少ない、食事や住まいにも困っている場合は、その緊急性を最初に伝えてください。",
    relatedTerms: ["生活保護相談", "生活費がない", "公的支援"],
  },
  medical: {
    searchTitle: "病院に行くお金がない・医療費が払えない",
    summary:
      "受診費用や保険料、医療費の支払いが難しいときに利用できる可能性がある相談先を案内します。",
    firstAction:
      "強い痛みや呼吸困難など緊急性がある場合は、相談窓口ではなく119番を利用してください。",
    relatedTerms: ["医療費相談", "無料低額診療", "国民健康保険"],
  },
  work: {
    searchTitle: "仕事を失った・働けない",
    summary: "失業、休職、病気などで働けず、収入や生活に困っているときの地域の総合相談窓口です。",
    firstAction: "仕事だけでなく家賃や生活費にも困っている場合は、まとめて伝えて大丈夫です。",
    relatedTerms: ["失業相談", "就労支援", "生活困窮相談"],
  },
  debt: {
    searchTitle: "借金を返せない・差し押さえが心配",
    summary:
      "借金、督促、給料や口座の差し押さえが心配なときに、生活と支払いを一緒に整理する入口です。",
    firstAction:
      "請求書が全部そろっていなくても相談できます。裁判所から届いた書類には期限があるため、その有無を伝えてください。",
    relatedTerms: ["借金相談", "督促", "債務整理"],
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
  },
  care: {
    searchTitle: "介護で生活や仕事が続けられない",
    summary:
      "本人や家族の介護で暮らしや仕事が難しくなったとき、介護保険や地域の支援へつながる相談入口です。",
    firstAction: "介護認定を受けていなくても、まず相談できます。",
    relatedTerms: ["介護相談", "地域包括支援センター", "介護保険"],
  },
  unknown: {
    searchTitle: "どこに相談すればいいか分からない",
    summary:
      "困りごとが複数ある、制度名が分からない、どの窓口に話せばよいか分からないときの総合相談入口です。",
    firstAction: "うまく説明できなくても、「生活のことで困っている」と伝えるだけで大丈夫です。",
    relatedTerms: ["生活相談", "福祉相談", "生活困窮者自立相談"],
  },
};

export function seoCategoryContent(categoryId: string): SeoCategoryContent {
  return CONTENT[categoryId] ?? CONTENT.unknown;
}
