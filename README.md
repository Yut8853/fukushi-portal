# くらし支援ナビ（fukushi-portal-mvp）

自治体・福祉相談窓口・支援制度をCSVで管理するNext.js 15のMVPです。Reactコンポーネントや
TypeScriptへ自治体データを直接書かず、`data/` のCSVを追加・更新すると画面へ反映される構成です。
将来Supabaseへ移行できるよう、CSVの読み込み、Zod検証、表示用View Modelを分離しています。

このREADMEは、開発者または別のAIが現状を判断して作業を引き継ぐための資料も兼ねています。

## 現在の状態

最終確認日: **2026-07-26**

| 項目 | 状態 |
| --- | --- |
| 都道府県マスター | 47件 |
| ポータル登録自治体 | 33件 |
| 全国団体データ | 1,919件（現行自治体1,741件、政令市行政区171件、集計・特殊地域7件） |
| 公式URL確定済み | 1,292 / 1,741自治体 |
| 公式URL未確定 | 449自治体 |
| クロールキュー | 1,292件、すべて`pending` |
| クロール処理済み | 0件 |
| 窓口データ | 13件 |
| 制度データ | 5件 |
| `data:validate` | 成功。公式URL未登録449件の警告1件 |
| `lint` | 成功 |
| `build` | 成功（Next.js 15.5.22） |
| `npm audit --omit=dev` | 本番依存の脆弱性0件 |

重要事項:

- 全国クロール本体はまだ実行していません。キューを生成した段階です。
- ワーカー起動には、実在する運営者連絡先を`CRAWLER_CONTACT`へ設定する必要があります。
- 公式URLが未確定の449自治体は、推測URLを保存せず空欄のままにしています。
- 自動抽出した情報は公開せず、必ず`review_required`として人間のレビュー対象にします。
- `/admin/*`はBasic認証で保護されています。認証環境変数が未設定の場合は503で閉鎖します。
- 緊急連絡先、運営者名、訂正窓口は一般公開前に人間が表示内容を最終確認してください。
- このディレクトリには現時点でGitリポジトリ（`.git`）がありません。
- `package-lock.json`と旧`pnpm-lock.yaml`が共存しています。現在の検証はnpmで行っています。

## セットアップ

Node.jsとnpmを用意し、プロジェクト直下で実行します。

```bash
npm install
cp .env.example .env.local
npm run dev
```

利用者向け画面は `http://localhost:3000/`、管理確認画面は以下です。

- `/admin/municipalities`: 自治体の登録状況、情報不足、期限切れ
- `/admin/review`: クロール候補のレビュー
- `/admin/crawl-jobs`: キュー、進捗、失敗理由
- `/admin/sources`: 取得した出典

### 公開・管理用の必須設定

```dotenv
ADMIN_BASIC_USER=admin
ADMIN_BASIC_PASSWORD=十分に長いランダムなパスワード
NEXT_PUBLIC_SITE_OPERATOR=運営者名
NEXT_PUBLIC_CORRECTION_EMAIL=訂正受付用メールアドレス
```

Basic認証は必ずHTTPS上で使用してください。`ADMIN_BASIC_PASSWORD`をGit、README、CSVへ
書き込まないでください。認証情報が未設定の場合、利用者向けページは表示されますが、
`/admin/*`は503で閉鎖されます。

## 利用者体験と安全設計

このサイトの成功基準はデータ件数ではなく、困っている人が少ない操作で適切な相談先へ
到達できることです。

- 全ページ上部に110、119、児童相談所虐待対応ダイヤル189、DV相談ナビ`#8008`を固定表示
- こころの危機には厚生労働省「こころの健康相談統一ダイヤル」を案内
- 制度名ではなく「今夜泊まる場所がない」「家賃が払えない」など生活状況から選択
- 地域を選ばなくても、困りごとを1つ選べば全国共通制度を表示
- 自治体を選んだ場合だけ、その自治体の制度と公開済み窓口を追加表示
- 電話番号はスマートフォンから直接発信可能
- 各窓口・制度に情報確認日と公式出典を表示
- `/about`に目的、免責事項、現時点の個人情報の取り扱いを表示
- `/corrections`に訂正依頼の手順と運用フローを表示
- 17px以上のモバイル本文、スキップリンク、フォーカス表示、セマンティックHTMLを使用

緊急連絡先は自治体CSVに依存しない共通UIです。出典は警察庁、総務省消防庁、
こども家庭庁、内閣府男女共同参画局、厚生労働省の公式ページです。

注意:

- `#8008`は各相談機関の受付時間内に限られ、緊急の危険がある場合は110を案内します。
- こころの健康相談統一ダイヤルの受付時間は接続先地域によって異なります。
- 緊急表示の番号や案内条件は、一般公開前および定期的に一次情報で再確認してください。

## データ構造

`data/` のCSVが正規の元データです。

- `prefectures.csv`: 都道府県
- `municipalities.csv`: ポータルで扱う自治体
- `categories.csv`: 困りごとの分類
- `offices.csv`: 自治体ごとの相談窓口
- `programs.csv`: 全国・都道府県・自治体・民間の支援制度
- `municipality-programs.csv`: 自治体と制度の関連、地域別上書き
- `sources.csv`: 情報の出典
- `nationwide-municipalities.csv`: e-Statから同期した全国自治体・行政区と公式URL
- `emergency-contacts.json`: 全ページ共通の緊急連絡先、公式出典、確認日
- `crawl/queue.json`: 再開可能なクロールキュー
- `crawl/results/{都道府県コード}/{自治体コード}.json`: 自治体別の抽出結果

主な実装:

- `lib/csv.ts`: 共通CSVパーサー
- `lib/data/schemas.ts`: Zodスキーマと列挙値
- `lib/data/repository.ts`: CSVから元データを取得する層
- `lib/data/view-models.ts`: 画面表示用データへの変換
- `crawler/`: robots、取得、安全性検証、抽出、保存、ワーカー
- `scripts/`: データ追加、同期、URL解決、検証、クロール運用
- `supabase/schema.sql`: 将来移行用の初期スキーマ

CSVのヘッダー名は変更しないでください。複数値は「・」区切りです。日付は`YYYY-MM-DD`、
真偽値は`true`または`false`を使用します。電話番号やURLが不明な場合は空欄にできますが、
公開情報には出典と最終確認日が必要です。

## 公開ルール

一般利用者向け画面に表示されるのは、原則として次の条件を満たす情報だけです。

- `status=published`
- 公開に必要な必須項目が存在する
- 窓口・制度には有効な`sourceId`が存在する
- `lastVerifiedAt`が登録されている

自治体ステータス:

```text
draft / researching / review_required / verified / published / expired / suspended
```

`published`以外の自治体は一般利用者向け画面へ表示しません。詳細情報が不足していても画面を
エラーにせず、全国共通窓口と自治体公式サイトへ誘導します。

## データを追加する

### 自治体

対話形式で`municipalities.csv`へ`draft`として追加します。

```bash
npm run municipality:add
```

入力項目は都道府県、自治体名、自治体コード、自治体種別、公式サイト、代表電話、対応レベルです。
自治体コード、または同一都道府県内の自治体名が重複する場合は追加しません。

直接CSVを編集する場合も、最初は`draft`または`review_required`にしてください。一次情報で確認し、
出典と最終確認日を登録してから`published`へ変更します。

### 窓口・制度・出典

1. `sources.csv`へ公的な一次情報を登録する
2. `offices.csv`または`programs.csv`へ情報を登録する
3. `sourceId`で出典を関連付ける
4. 不明項目は推測せず空欄にする
5. 未確認項目がある場合は`status=review_required`にする
6. `npm run data:validate`を実行する

雛形は`import/`にもあります。

## 全国自治体マスターと公式URL

### e-Statから自治体一覧を同期

```bash
npm run municipalities:sync
```

`data/nationwide-municipalities.csv`を更新します。自治体コードの基礎データはe-Statの
市区町村コードを使用しています。同期後は既に確認済みの公式URLを失わないことを確認してください。

### 公式URLを解決

標準的な自治体ドメイン候補だけを検証する場合:

```bash
npm run municipality-urls:resolve
```

独自ドメインを検索候補から発見するフォールバックを有効にする場合:

```bash
URL_RESOLVER_SEARCH=1 URL_RESOLVER_CONCURRENCY=4 \
npm run municipality-urls:resolve
```

特定自治体だけを確認する場合:

```bash
URL_RESOLVER_SEARCH=1 URL_RESOLVER_CONCURRENCY=1 \
URL_RESOLVER_CODES=082015,012211 \
npm run municipality-urls:resolve
```

URL解決処理は次を行います。

- 自治体名の読みから標準的な`.lg.jp`等の候補を生成
- 検索フォールバックでは検索結果を候補発見にのみ使用
- HTTPS、DNS、プライベートIP、リダイレクト先を検証
- ページ本文、タイトル、自治体名相当のドメインを照合
- 検証できたURLだけを`officialUrl`へ保存

注意: 検索フォールバックは完全な公式性保証ではありません。独自ドメインは誤認余地があるため、
J-LIS、都道府県公式サイト、自治体ページの運営者表示などを使った人間の最終確認が必要です。
過去の試験で、ふるさと納税ポータルを自治体サイトと誤認するケースを検出し、該当URLを削除して
ドメイン検証を強化しています。

## 全国クロール

### キュー作成

```bash
npm run crawl:queue -- --all
npm run crawl:queue -- --prefecture=08
npm run crawl:queue -- --municipalities=082015,082201
```

公式URL未登録自治体はキューへ入りません。既存キューへ重複なく追加され、停止後も再開できます。

### 環境変数

`.env.example`:

```dotenv
CRAWLER_CONTACT=your-email@example.com
CRAWLER_CONCURRENCY=2
CRAWLER_DELAY_MS=2000
CRAWLER_TIMEOUT_MS=15000
CRAWLER_MAX_RETRIES=3
CRAWLER_MAX_PAGES=20
ADMIN_BASIC_USER=admin
ADMIN_BASIC_PASSWORD=replace-with-a-long-random-password
NEXT_PUBLIC_SITE_OPERATOR=運営者名
NEXT_PUBLIC_CORRECTION_EMAIL=correction@example.com
```

`CRAWLER_CONTACT`は必須です。連絡先未設定のまま`crawl:worker`を実行すると、意図どおりエラーで
停止します。実在しないメールアドレスや仮の連絡先で本番クロールを開始しないでください。

設定可能範囲:

- 並列数: 1〜8
- リクエスト間隔: 500〜60,000ms
- タイムアウト: 1,000〜120,000ms
- 最大リトライ: 0〜3
- 自治体あたり最大ページ数: 1〜100

### ワーカー実行

```bash
export CRAWLER_CONTACT=operator@example.com
export CRAWLER_CONCURRENCY=2
export CRAWLER_DELAY_MS=2000
npm run crawl:worker
```

静的HTMLを優先し、同一公式サイト内の福祉関連リンクとPDFを既定で最大20ページ取得します。
robots.txtを尊重し、localhost、プライベートIP、クラウドメタデータIP、認証情報付きURL、
非HTTPスキームを拒否します。リダイレクト先も再検証します。

対象キーワードには福祉、生活、相談、支援、給付、困窮、生活保護、障害、介護、子育て、
ひとり親、DV、虐待、債務、法律などが含まれます。

自動抽出結果は例外なく`review_required`です。自動的に`published`にはなりません。

### 状態確認・再実行

```bash
npm run crawl:status
npm run crawl:report
npm run crawl:retry-failed
```

停止後は同じ`crawl:worker`で未処理・リトライ待ちから再開できます。失敗・部分成功だけを
再投入する場合は`crawl:retry-failed`を使用します。

クロール状態:

```text
pending / running / completed / partial / failed / retry_waiting
review_required / skipped / blocked_by_robots
```

## 検証

CSV編集やコード変更後は、最低限次をすべて実行します。

```bash
npm run data:validate
npm run lint
npm run build
```

`data:validate`は以下を確認します。

- 必須項目
- 自治体コードの重複
- 都道府県、自治体、窓口、出典IDの参照整合性
- URL、電話番号、日付形式
- 列挙値
- 公開情報の出典と最終確認日
- `published`情報の公開必須項目
- 全国自治体データの件数と公式URL未登録数

エラーがある場合は終了コード1、確認を要するが処理可能な内容は警告として表示されます。

2026-07-26時点の期待結果:

```text
エラー: 0件
警告: 1件
現行市区町村の公式URLが449件未登録
```

## Supabase移行時の変更箇所

現在は`lib/data/repository.ts`がローカルCSVを読み込みます。Supabase移行では主に次を変更します。

1. `supabase/schema.sql`をレビューし、実DBへマイグレーションする
2. CSVを各テーブルへインポートする
3. `lib/data/repository.ts`をSupabase実装へ差し替える
4. サーバー側クライアントと環境変数を追加する
5. Basic認証をSupabase Auth等へ置き換え、役割別権限と監査ログを追加する
6. クロール結果JSONをDBまたはオブジェクトストレージへ保存する
7. レビュー承認処理を永続化し、公開データへの反映フローを実装する

View Modelと画面はリポジトリ層を介しているため、CSV固有処理をUIへ持ち込まない方針です。

## 未実装・既知の制約

- 全国1,741自治体のうち449自治体は公式URL未確定
- 全国クロールは未開始
- JavaScriptレンダリング必須サイトへのブラウザクロールは未実装
- Excel/CSVは型に含まれるが、現ワーカーの中心はHTMLとPDF
- OCRが必要な画像PDFへの対応は未実装
- 自動抽出結果をCSVへ承認反映する完全な編集ワークフローは未実装
- 管理画面はBasic認証のみ。個人アカウント、役割別権限、ログアウト、監査ログは未実装
- Supabase接続は未実装
- 全国規模での負荷試験、長時間連続運転、失敗率測定は未実施
- 公式URL検索フォールバックには人間による最終監査が必要
- 本番依存の監査は0件。開発依存を含む通常の`npm audit`には13件の高リスク警告が残る
- 訂正窓口はメール起動のみで、受付チケット・進捗管理・SLAは未実装
- ブラウザが利用できない検証環境だったため、実機での最終目視・スクリーンリーダー検証は未実施

## 次の担当者・AIへの推奨手順

1. このREADMEと`package.json`、`lib/data/schemas.ts`、`middleware.ts`、`crawler/security.ts`を読む
2. `npm run data:validate && npm run lint && npm run build`で基準状態を再確認する
3. 管理認証、運営者名、訂正窓口メールを本番環境へ設定する
4. スマートフォン、キーボード、スクリーンリーダー、低速回線で利用者導線を確認する
5. 緊急連絡先と免責表示を公的な一次情報・法務観点で最終確認する
6. 公式URL1,292件をJ-LISまたは都道府県公式一覧と照合する
7. 未確定449件を一次情報で補完する
8. 実在する`CRAWLER_CONTACT`を利用者から受け取る
9. まず1自治体、次に茨城県で試験クロールする
10. 抽出精度、robots、負荷、失敗処理、レビュー画面を確認する
11. 自動候補を人間が確認し、公開CSVへ反映する承認処理を完成させる

クロール開始前に、対象自治体数、並列数、待機時間、連絡先、保存容量、停止方法を必ず確認してください。
# fukushi-portal
