# くらし支援ナビ

生活費、家賃、食料、仕事、DV、子育て、介護などで困っている人が、地域の公的な相談先を探すための情報案内サイトです。

運営者は **JUNKBRANDING** です。行政機関・支援団体ではなく、支援の提供、仲介、受給可否の判断、個別相談への回答は行いません。掲載情報は公式一次情報を基に確認しますが、利用時には各窓口の公式ページでも最新情報を確認してください。

- 公開URL: <https://fukushi.junkbranding.com/>
- 情報の訂正: <hello@junkbranding.com>
- 最終技術確認日: 2026-07-27

## 現在の規模

| 項目 | 件数・状態 |
| --- | ---: |
| 都道府県 | 47 |
| 対象自治体 | 1,741 |
| 公開窓口 | 7,211 |
| 支援制度 | 25 |
| 主要4導線の不足 | 0自治体 |
| 受付時間確認済み | 1,342窓口 |
| データ検証 | エラー0・警告0 |

主要4導線は、自治体代表、生活困窮者自立相談支援機関、住居確保給付金、生活保護相談・申請窓口です。

受付時間の監査結果は [`reports/office-hours-audit.json`](reports/office-hours-audit.json) に保存しています。「受付時間が空欄」であることは未作業とは限りません。公式ページから窓口固有の時間を安全に特定できなかった場合は、推測せず空欄にしています。

## サイトの基本方針

### 利用者向け

- 制度名ではなく「困りごと」から探せるようにする
- 1画面に1STEPだけ表示し、選択に応じて画面を切り替える
- STEP 1「困りごと」→ STEP 2「地域」→ STEP 3「案内」
- STEP間で強制的な自動スクロールをしない
- 地域を選ばなくても全国共通の支援へ進める
- 直通窓口、自立相談、代表電話を区別する
- 代表電話では事情を詳しく話さず、担当部署への取り次ぎを依頼する台本を表示する
- 夜間・休日、電話できない人、電話がつながらない場合の代替導線を示す
- DVカテゴリでは代表電話を安易に表示せず、「すぐに閉じる」機能を常設する
- 難しい制度用語を避け、必要な場合はやさしい補足を付ける

### 情報掲載

- 国、都道府県、市区町村などの公式一次情報を優先する
- 電話番号、所在地、管轄、受付時間を推測しない
- 県単位の公式一覧がある制度は、一覧と自治体の対応関係を照合する
- 住所で担当が変わる窓口は、管轄地域・対象条件を明記する
- 古い個別窓口を無理に載せるより、自治体代表と公式一覧へのリンクを使う
- 支援の利用可否や結果を保証する表現を使わない
- 自動抽出した情報をそのまま公開しない

### 個人運営

- 運営者が行政機関・支援団体ではないことを明示する
- 個別の生活相談を訂正窓口で受け付けない
- 情報の正確性・最新性を保証しない
- 制度内容と受給可否は公式窓口で確認してもらう
- 更新頻度の低下や運営休止の可能性を明示する
- 最終確認から180日を超えた情報には注意を表示する

## 技術構成

| 分類 | 技術 |
| --- | --- |
| フレームワーク | Next.js 16.2.12（App Router / Turbopack） |
| UI | React 19.2.8 |
| 言語 | TypeScript 5.9.3 |
| 実行環境 | Node.js 24 |
| データ検証 | Zod 4 |
| HTML解析 | Cheerio |
| PDF解析 | pdf-parse |
| クロール制御 | robots-parser、独自のリトライ・間隔制御 |
| 主データ | CSV / JSON |
| 任意バックエンド | Supabase |
| 静的検査 | ESLint 9 |

通常はCSVを正データとして動作します。`DATA_BACKEND=supabase` を設定した場合だけ、サーバー側でSupabaseから読み込みます。UIコンポーネントへ自治体や窓口データを直接記述しません。

## ディレクトリ構成

```text
app/                 Next.jsのページ、API、SEO、構造化データ
components/          検索UI、緊急帯、すぐ閉じる、フィードバック
lib/                 CSV読込、スキーマ、表示モデル、ルーティング
data/                公開用CSV・JSON
crawler/             安全な取得、抽出、robots.txt対応、候補生成
scripts/             生成、監査、検証、公開用CLI
reports/             全件監査などの保存レポート
import/              CSV投入用テンプレート
supabase/            任意のDBスキーマとマイグレーション
```

主要な画面は次のとおりです。

```text
/                                      3STEP検索
/support                               都道府県一覧
/support/[municipalityCode]            自治体一覧
/support/[municipalityCode]/[category] 困りごと×自治体のSEOページ
/about                                 運営者・免責
/corrections                           情報訂正
/admin/*                               管理・候補審査
```

## セットアップ

### 必要環境

- Node.js 24系
- npm

```bash
npm ci
npm run dev
```

<http://localhost:3000> を開きます。

本番相当の確認:

```bash
npm run build
npm run start
```

## 環境変数

`.env.local` の例:

```dotenv
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SITE_OPERATOR=
NEXT_PUBLIC_CORRECTION_EMAIL=
GOOGLE_SITE_VERIFICATION=

ADMIN_BASIC_USER=
ADMIN_BASIC_PASSWORD=
# 複数利用者の場合:
# ADMIN_BASIC_USERS_JSON=

CRAWLER_CONTACT=
CRAWLER_CONCURRENCY=
CRAWLER_DELAY_MS=
CRAWLER_TIMEOUT_MS=
CRAWLER_MAX_RETRIES=
CRAWLER_MAX_PAGES=
```

Supabaseを使う場合だけ追加します。

```dotenv
DATA_BACKEND=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

注意:

- `SUPABASE_SERVICE_ROLE_KEY` に `NEXT_PUBLIC_` を付けない
- `.env.local` をGitへ追加しない
- 管理画面を公開する場合はBasic認証を必ず設定する
- `CRAWLER_CONTACT` 未設定ではクロールを開始しない

## データモデル

### `data/prefectures.csv`

47都道府県のマスターです。

### `data/municipalities.csv`

サイトで選択できる自治体です。自治体コード、名称、読み、公式URL、代表電話、整備レベル、確認日を持ちます。

### `data/offices.csv`

相談窓口の正データです。主な項目:

- `municipalityId`: 対象自治体
- `categoryId`: 主分類
- `name` / `plainName`: 正式名とやさしい表示名
- `department`: 担当部署
- `phone`, `address`, `officialUrl`
- `openingHours`, `closedDays`
- `serviceArea`, `eligibilityConditions`: 管轄地域・対象条件
- `sourceId`: 根拠となる出典
- `status`: `published` または審査状態
- `lastVerifiedAt`: 最終確認日

### `data/categories.csv`

困りごとの横軸です。UIの文言・説明・並び順はここから生成します。

### `data/programs.csv`

全国共通または地域固有の支援制度です。

### `data/municipality-programs.csv`

自治体と制度の関連を管理します。

### `data/sources.csv`

公式出典、発行元、確認日、監視対象を管理します。

### `data/emergency-contacts.json`

緊急帯の連絡先です。変更の影響が大きいため、必ず公式一次情報を確認して更新します。

## データ生成・追加手順

### 1. テンプレートを使う

新しいデータをまとめて作る場合は `import/` のテンプレートを基準にします。

```text
import/municipalities-template.csv
import/offices-template.csv
import/regional-programs-template.csv
```

CSVはUTF-8、ヘッダー名固定です。セルにカンマや改行を含む場合は正しく引用符で囲みます。

### 2. 自治体を追加する

```bash
npm run municipality:add
```

対話形式で入力し、最初は `draft` 状態で追加されます。

複数自治体の同期・昇格には次を使います。

```bash
npm run municipalities:sync
npm run municipalities:promote -- --count=10 --verified-at=2026-07-27
```

`municipalities:sync` はe-Statから全国マスターを再生成し、`municipalities:promote` は到達確認できた自治体を公開側CSVへ追加します。どちらもファイルを書き換えるため、実行前後のGit差分を必ず確認してください。

自治体公式URLの解決:

```bash
URL_RESOLVER_CODES= npm run municipality-urls:resolve
```

URLを自動発見しても、自治体名、公式ドメイン、ページ内容を確認するまで正データにしません。

### 3. 窓口を追加する

基本手順:

1. 都道府県または自治体の公式一覧を探す
2. 一覧の更新日・対象年度を確認する
3. 自治体と所管窓口の対応を照合する
4. 電話番号、所在地、管轄を転記する
5. 根拠URLを `sources.csv` に登録する
6. `offices.csv` から `sourceId` を参照する
7. 確認できない値は空欄にする
8. 検証コマンドをすべて通す

正式な課名は自治体ごとに異なるため、代表電話の案内文では「生活保護の担当」など機能名を使います。

## クロールと候補生成

クロール結果は公開データではなく、審査候補です。

### キュー作成と状態確認

```bash
npm run crawl:queue -- --municipalities=082015,082201
npm run crawl:status
npm run crawl:report
```

### 限定実行

最初から全国一括で動かさず、自治体や件数を限定して挙動を確認します。

```bash
npm run crawl:worker -- --municipalities=082015,082201 --limit=2
```

クロール処理は以下を守ります。

- robots.txtに従う
- 取得間隔を空ける
- 同時接続数を制限する
- タイムアウトと再試行回数を制限する
- HTTPSへの安全な移行以外で403を回避しない
- HTML・PDFのサイズとURLを検査する
- 外部ドメインへの無制限な巡回をしない

失敗分の再試行:

```bash
npm run crawl:retry-failed -- --municipalities=082015,082201
```

差分確認:

```bash
npm run crawl:diff -- --municipality=082201 --candidate=候補ID
```

### 候補の公開

```bash
npm run crawl:publish:test
npm run crawl:publish -- --municipality=082201 --candidate=候補ID
npm run crawl:publish -- --municipality=082201 --candidate=候補ID --actor=確認者名 --confirm
```

公開前に、窓口名、電話番号、対象自治体、カテゴリ、出典、重複を目視確認します。候補を無審査で `published` にしないでください。

## 受付時間の生成・監査

受付時間は誤関連の危険が高いため、通常の窓口データより保守的に扱います。庁舎全体、別部署、フッターの時間を対象窓口へ誤適用しないことが最優先です。

### 1. 未登録状況を確認

```bash
npm run crawl:hours:inventory
```

### 2. 公式URLを走査

```bash
npm run crawl:hours:scan
```

用途別・分割実行:

```bash
npm run crawl:hours:scan -- --type=representative --offset=0 --limit=100
npm run crawl:hours:scan -- --type=self-reliance --discover
npm run crawl:hours:scan -- --type=direct --retry-errors
```

候補化の安全条件:

- 登録済み公式URLだけを対象にする
- ページ内で窓口電話番号を確認する
- 電話番号の周辺250文字以内にある時間だけを候補にする
- 候補は `review_required` とする
- 複数時間帯や別施設の時間は目視確認する

走査結果は `data/crawl/office-hours-candidates.json` に生成されます。このファイルは一時作業物で、正データではありません。

### 3. 抽出テスト

```bash
npm run crawl:hours:test
```

### 4. 適用前確認

```bash
npm run crawl:hours:apply
```

この段階はドライランです。内容を確認してから適用します。

```bash
npm run crawl:hours:apply -- --apply
```

### 5. 同一窓口への伝播

完全一致する電話番号または正規化住所を持ち、矛盾がない場合だけ伝播できます。

```bash
npm run crawl:hours:propagate
npm run crawl:hours:propagate -- --apply
```

### 6. 休業日補完

「平日」「月曜日から金曜日」のように明示された情報からだけ補完します。

```bash
npm run crawl:hours:closed-days
npm run crawl:hours:closed-days -- --apply
```

### 7. 全件監査レポート

全URL走査の完了後:

```bash
npm run crawl:hours:audit
```

出力は `reports/office-hours-audit.json` です。各窓口を次の理由へ分類します。

- `verified_full`: 受付時間・休業日を確認済み
- `verified_hours_only`: 受付時間のみ確認済み
- `no_phone`: 電話番号がない
- `source_unreachable`: 公式出典を取得できない
- `manual_review_required`: 人による確認が必要
- `rejected_cross_office_match`: 別窓口の時間なので不採用
- `primary_source_scanned_no_safe_hours`: 公式ページから安全に特定できない

「安全に特定できない」は、ウェブ上に情報が存在しないという意味ではありません。

## 品質チェック体制

### 自動チェック

変更後は最低限、次を実行します。

```bash
npm run data:validate
npm run data:quality
npm run data:audit
npm run seo:audit
npm run lint
npm run build
```

それぞれの役割:

| コマンド | 確認内容 |
| --- | --- |
| `data:validate` | CSV形式、Zodスキーマ、参照整合性、必須項目 |
| `data:quality` | 未登録項目、確認期限、主要項目の品質 |
| `data:audit` | 1,741自治体の主要4導線と全国整備状況 |
| `seo:audit` | SEOページ、タイトル、説明、URL生成 |
| `lint` | TypeScript・React・Next.jsの静的検査 |
| `build` | 本番コンパイル、型検査、ルート生成 |

出典の到達性・変更確認:

```bash
npm run sources:monitor -- --limit=20
```

### 人による確認

自動チェックだけでは公開しません。次を目視します。

- 公式発行元か
- 資料の更新日・対象年度は現行か
- 自治体と窓口の管轄が一致するか
- 電話番号が代表・直通・FAXのどれか
- 受付時間が対象窓口固有か
- 「必ず支援される」と誤解させないか
- DV利用者の安全を損なう導線がないか
- スマートフォンで電話リンクが機能するか
- 3STEPが自動スクロールせず切り替わるか
- キーボード操作と読み上げ順が自然か

### 公開前チェックリスト

```text
[ ] 公式一次情報を確認した
[ ] 推測値を入れていない
[ ] sourceIdとlastVerifiedAtを更新した
[ ] data:validateがエラー0・警告0
[ ] data:qualityで意図しない欠落がない
[ ] data:auditで主要4導線不足が0
[ ] seo:auditが成功
[ ] lintが成功
[ ] buildが成功
[ ] スマートフォン実機で3STEPを操作した
[ ] 電話発信、外部リンク、すぐ閉じるを確認した
[ ] 変更差分に個人情報・秘密情報がない
```

## SEO方針

検索流入だけでなく、支援者が当事者へ共有できるURLを作ることを目的とします。

- 困りごと×自治体の個別ページを生成
- `title`、`description`、canonicalを設定
- JSON-LDのWebSite、BreadcrumbList、GovernmentService等を出力
- `sitemap.xml` と `robots.txt` をNext.jsから生成
- OGP画像を生成
- トップの選択状態をクエリパラメータで復元
- Google Search Console用の確認値を環境変数で管理

SEOのために内容の薄いページや、確認できない窓口情報を量産しません。

## 緊急情報の更新方針

DV、虐待、自殺念慮などの緊急情報は影響が大きいため、番号、料金、受付時間、対応手段を必ず所管省庁・公式運営元で確認します。

- 電話番号だけでなく無料・有料を確認する
- 24時間か、地域や曜日で時間が異なるかを確認する
- 電話、チャット、メールなど非通話手段を併記する
- DVカテゴリではQuick Exitと履歴注意を維持する
- 緊急窓口と通常の自治体窓口を混同しない

緊急性のある個別相談が訂正メールへ届いても、運営者が相談対応を引き受ける設計にはしません。公式の緊急窓口を案内する定型対応に限定します。

## Supabaseへの移行

CSVのスキーマとDBアクセスを分離しているため、任意でSupabaseへ投入できます。

1. `supabase/schema.sql` を適用
2. `supabase/migrations/` を順に適用
3. 環境変数を設定
4. ドライランを確認
5. 明示的に適用

```bash
npm run supabase:seed
npm run supabase:seed -- --apply
```

本番切り替え前に、CSVバックエンドと件数・表示結果が一致することを確認してください。

## 変更時のルール

- 既存CSVを一括置換する前に差分件数を確認する
- 自動生成物と手動確認済みデータを混同しない
- `--apply` のないドライランを先に実行する
- 関係ない既存変更を上書きしない
- データを削除する場合は対象IDと復旧方法を確認する
- 1つの論理変更ごとにコミットする
- READMEの件数と確認日は大きなデータ更新時に更新する

## 既知の限界

- すべての窓口に受付時間・休業日があるわけではない
- 公式ページがrobots.txt、403、リンク切れなどで取得できない場合がある
- 住所によって担当窓口が変わる制度を完全自動判定できない
- 祝日、年末年始、臨時閉庁をリアルタイム判定しない
- サイトは支援の提供、相談受付、受給可否の判定を行わない
- 公開後もスマートフォン、低速回線、スクリーンリーダーの継続的な実機確認が必要

## ライセンスと再利用

ソースコードおよび収録データの再利用条件は、正式なライセンスファイルが追加されるまで未設定です。行政機関の公開情報にも各発行元の利用条件が適用されます。無断で「自由に再利用可能」と判断しないでください。
