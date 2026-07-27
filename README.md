# くらし支援ナビ

[![CI](https://github.com/Yut8853/fukushi-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/Yut8853/fukushi-portal/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-lightgrey.svg)](DATA_LICENSE.md)

制度名を知らなくても、全国1,741自治体の相談窓口にたどり着ける案内サイトです。生活費、家賃、食料、仕事、DV、子育て、介護など、いまの困りごとから地域の公的な相談先を探せます。

![くらし支援ナビのトップ画面](docs/images/site-preview.png)

運営者は **JUNKBRANDING** です。行政機関・支援団体ではなく、支援の提供、仲介、受給可否の判断、個別相談への回答は行いません。掲載情報は公式一次情報を基に確認しますが、利用時には各窓口の公式ページでも最新情報を確認してください。

- 公開URL: <https://fukushi.junkbranding.com/>
- 情報の訂正: <hello@junkbranding.com>
- 最終技術確認日: 2026-07-27

## READMEの使い方

| 読みたい内容                   | 参照先                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| サイトの目的・掲載方針         | [サイトの基本方針](#サイトの基本方針)                                                            |
| ローカルで起動する             | [セットアップ](#セットアップ)                                                                    |
| 使用技術・ライブラリ・外部連携 | [技術構成](#技術構成)、[プラグイン・ライブラリ・外部サービス](#プラグインライブラリ外部サービス) |
| データを追加・更新する         | [データ生成・追加手順](#データ生成追加手順)                                                      |
| 2万ページの生成方法を確認する  | [2万ページをどう作っているか](#2万ページをどう作っているか)                                      |
| クロール候補を審査する         | [クロールと候補生成](#クロールと候補生成)                                                        |
| 公開前に検証する               | [品質チェック体制](#品質チェック体制)                                                            |
| 日常運用・障害対応を行う       | [運用ルール](#運用ルール)                                                                        |
| SEO・監視・公開状態を確認する  | [公開・運用チェック](#公開運用チェック)                                                          |
| 再利用条件を確認する           | [ライセンスと再利用](#ライセンスと再利用)                                                        |

## 運営を始める人が最初にすること

1. Node.js 24系とnpmを用意する
2. `npm ci` を実行する
3. `.env.example` を参考に `.env.local` を作る
4. `npm run data:validate` と `npm run build` が成功することを確認する
5. GitHub Actionsの `CI` と `Uptime` が成功していることを確認する
6. Vercel、GitHub、Google Search Consoleの通知先が現在の運営者になっているか確認する
7. READMEの公開件数・最終技術確認日と、実データの状態が一致するか確認する

このサイトは支援情報を扱うため、「表示できる」だけでは公開条件を満たしません。電話番号、対象地域、受付時間、緊急情報は、公式一次情報と照合してから公開してください。

## 現在の規模

| 項目                   |     件数・状態 |
| ---------------------- | -------------: |
| 都道府県               |             47 |
| 対象自治体             |          1,741 |
| 公開窓口               |          7,211 |
| 支援制度               |             25 |
| インデックス対象ページ |         22,634 |
| 主要4導線の不足        |        0自治体 |
| 受付時間確認済み       |      1,342窓口 |
| データ検証             | エラー0・警告0 |

主要4導線は、自治体代表、生活困窮者自立相談支援機関、住居確保給付金、生活保護相談・申請窓口です。

受付時間の監査結果は [`reports/office-hours-audit.json`](reports/office-hours-audit.json) に保存しています。「受付時間が空欄」であることは未作業とは限りません。公式ページから窓口固有の時間を安全に特定できなかった場合は、推測せず空欄にしています。

## 2万ページをどう作っているか

22,634ページを1ページずつ手作業で作成したわけではありません。Next.jsの動的ルートを使い、自治体データと困りごとカテゴリを組み合わせて、アクセス時に共通テンプレートからページを生成します。

```text
1,741自治体 × 14カテゴリ
  = 最大24,374通りのURL

公開済み自治体・確認済み窓口・安全上の掲載条件で絞り込み
  = 現在のインデックス対象22,634ページ
```

URLは次の形式です。

```text
/support/{自治体ID}/{カテゴリID}
```

例えば、水戸市の「今日食べるものがない」ページへアクセスすると、[`app/support/[municipalityCode]/[categoryId]/page.tsx`](app/support/[municipalityCode]/[categoryId]/page.tsx) が次のデータを組み合わせます。

- `data/municipalities.csv`：自治体名、自治体コード、公式URL
- `data/categories.csv`：困りごとの表示名、人が確認した電話台本
- `data/offices.csv`：電話番号、受付時間、所在地、担当カテゴリ
- `data/programs.csv`：全国・自治体の支援制度
- `data/sources.csv`：情報の根拠となる公式ページ
- `lib/seo-content.ts`：カテゴリ別のタイトル、要約、最初の行動

ページ本文、タイトル、description、構造化データは、この共通テンプレートと登録データから生成します。生成済みページは最大1日キャッシュし、その後のアクセス時に再検証します。

すべての組み合わせを検索エンジンへ無条件に公開しているわけではありません。存在しない自治体・カテゴリは404にし、公開窓口がないページは`noindex`にします。`sitemap.xml`にも掲載条件を満たすURLだけを出力します。現在の対象件数は次のコマンドで再計算できます。

```bash
npm run seo:audit
```

この仕組みで保証しているのは、ページ構造とデータ参照の一貫性です。「2万ページすべてを人が個別に執筆・目視確認した」という意味ではありません。電話番号や受付時間などの正データは公式一次情報を基に管理し、自動抽出結果は審査前の候補として扱います。

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

| 分類             | 技術                                      |
| ---------------- | ----------------------------------------- |
| フレームワーク   | Next.js 16.2.12（App Router / Turbopack） |
| UI               | React 19.2.8                              |
| 言語             | TypeScript 5.9.3                          |
| 実行環境         | Node.js 24                                |
| データ検証       | Zod 4                                     |
| HTML解析         | Cheerio                                   |
| PDF解析          | pdf-parse                                 |
| クロール制御     | robots-parser、独自のリトライ・間隔制御   |
| 主データ         | CSV / JSON                                |
| 任意バックエンド | Supabase                                  |
| 静的検査         | ESLint 9                                  |

通常はCSVを正データとして動作します。`DATA_BACKEND=supabase` を設定した場合だけ、サーバー側でSupabaseから読み込みます。UIコンポーネントへ自治体や窓口データを直接記述しません。

## プラグイン・ライブラリ・外部サービス

「プラグイン」という言葉が複数の仕組みを指すため、このプロジェクトでは次のように区別します。

### npmライブラリ

`package.json` と `package-lock.json` でバージョンを固定し、`npm ci` で導入します。

`package.json` の基本設定:

| 項目                | 意味                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `private: true`     | 誤ってnpmレジストリへ公開しない                                         |
| `dependencies`      | 本番実行・ビルド・データ処理で必要なパッケージ                          |
| `devDependencies`   | 型定義、TypeScript実行、lintなど開発時のパッケージ                      |
| `overrides`         | `postcss` と `sharp` の間接依存も、直接指定した安全なバージョンへ揃える |
| `package-lock.json` | 実際に導入する依存関係全体を固定する。手で編集しない                    |

| パッケージ                      | 用途                                        | 主に使う場所                                                       |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `next` / `react` / `react-dom`  | Web画面、ルーティング、SEOメタデータ、API   | `app/`、`components/`                                              |
| `postcss`                       | Next.jsのCSS処理                            | ビルド時                                                           |
| `zod`                           | CSV・JSONの型と必須項目の検証               | `lib/data/`、検証スクリプト                                        |
| `cheerio`                       | 公式ページのHTML解析                        | `crawler/`                                                         |
| `pdf-parse`                     | 行政PDFのテキスト抽出                       | `crawler/`                                                         |
| `robots-parser`                 | 取得先のrobots.txt確認                      | `crawler/`                                                         |
| `sanitize-html`                 | HTMLサニタイズ用として導入済み              | 現行コードから直接参照なし。利用目的を再確認し、不要なら別PRで削除 |
| `wanakana`                      | 自治体名などの読みの正規化                  | データ処理                                                         |
| `sharp`                         | Next.jsの画像生成・最適化依存               | ビルド、OGP画像。アプリからの直接参照なし                          |
| `tsx`                           | TypeScript製の運用スクリプト実行            | `npm run data:*`、`crawl:*`                                        |
| `typescript` / `@types/*`       | TypeScriptコンパイルとNode・React等の型情報 | 開発、CI、ビルド                                                   |
| `eslint` / `eslint-config-next` | React・Next.jsの静的検査                    | `npm run lint`                                                     |

依存関係を更新するときは、個別パッケージだけでなく `npm run lint` と `npm run build` まで確認し、`package-lock.json` も同じコミットへ含めます。メジャーバージョン更新はデータ更新と分けてください。

### package.jsonのコマンド

#### 開発・検証

| コマンド                                | 用途                                                                    | ファイル変更                                  |
| --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| `npm run dev`                           | 開発サーバーを起動                                                      | なし                                          |
| `npm run build`                         | 本番コンパイル、型検査、ルート生成                                      | `.next/` のみ                                 |
| `npm run start`                         | `build` 済みの本番サーバーを起動                                        | なし                                          |
| `npm run lint`                          | `app`、`components`、`crawler`、`lib`、`scripts`、`proxy.ts` を静的検査 | なし                                          |
| `npm run data:validate`                 | CSV/JSON形式、Zod、参照関係、必須値を検査                               | なし                                          |
| `npm run data:quality`                  | 主要導線、欠落項目、確認期限を集計                                      | なし                                          |
| `npm run data:audit`                    | 全国1,741自治体と主要4導線の完成状態を監査                              | なし                                          |
| `npm run seo:audit`                     | カテゴリ文面とインデックス対象ページを監査                              | なし                                          |
| `npm run sources:monitor -- --limit=20` | 公式出典の到達性・変更を限定確認                                        | `data/source-monitor.json` を更新する場合あり |

#### 自治体・バックエンド

| コマンド                                                                | 用途                                | 注意                               |
| ----------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `npm run municipality:add`                                              | 自治体を対話形式でdraft追加         | 実行後にCSV差分を確認              |
| `npm run municipalities:sync`                                           | e-Statから全国自治体マスターを同期  | 大量変更になり得る                 |
| `npm run municipalities:promote -- --count=10 --verified-at=YYYY-MM-DD` | 確認済み自治体を公開側へ昇格        | 日付と対象件数を必ず確認           |
| `npm run municipality-urls:resolve`                                     | 自治体公式URLの候補を解決           | 自動発見をそのまま正データにしない |
| `npm run supabase:seed`                                                 | CSVとSupabaseの投入予定をドライラン | 通常は書き込まない                 |
| `npm run supabase:seed -- --apply`                                      | Supabaseへ実際に投入                | 本番接続先とバックアップを確認     |

#### クロール

| コマンド                                                                                 | 用途                           | 注意                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------- |
| `npm run crawl:queue -- --municipalities=...`                                            | 対象自治体の取得キューを作成   | 最初は少数自治体に限定                              |
| `npm run crawl:worker -- --municipalities=... --limit=N`                                 | キューを取得・解析             | robots.txt、間隔、連絡先設定を維持                  |
| `npm run crawl:retry-failed`                                                             | 失敗した取得を再キュー化       | キューを書き換える。恒久的な403等を無限再試行しない |
| `npm run crawl:status`                                                                   | キューの状態を表示             | 読み取りのみ                                        |
| `npm run crawl:report`                                                                   | クロール結果を集計             | 読み取りのみ                                        |
| `npm run crawl:diff -- --municipality=... --candidate=...`                               | 指定候補と公開データの差を表示 | 読み取りのみ                                        |
| `npm run crawl:publish -- --municipality=... --candidate=...`                            | 指定候補の公開予定をドライラン | 差分確認前に確定しない                              |
| `npm run crawl:publish -- --municipality=... --candidate=... --actor=確認者名 --confirm` | 審査済み候補を正データへ反映   | バックアップと対象IDを確認                          |
| `npm run crawl:publish:test`                                                             | 公開処理の安全条件をテスト     | 読み取り・テスト                                    |

#### 受付時間

| コマンド                                     | 用途                                 | 注意                                     |
| -------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `npm run crawl:hours:test`                   | 受付時間抽出器のテスト               | 抽出ロジック変更時に必須                 |
| `npm run crawl:hours:inventory`              | 登録済み・未登録件数を集計           | 読み取りのみ                             |
| `npm run crawl:hours:scan`                   | 公式ページから候補を生成             | 候補であり未確認                         |
| `npm run crawl:hours:reprocess`              | 既存取得結果を新しい抽出規則で再解析 | 候補の増減を確認                         |
| `npm run crawl:hours:audit`                  | 全件監査レポートを生成               | `reports/office-hours-audit.json` を更新 |
| `npm run crawl:hours:apply`                  | 審査済み候補の反映予定を表示         | ドライラン                               |
| `npm run crawl:hours:apply -- --apply`       | 受付時間を正データへ反映             | 窓口固有の時間か目視確認                 |
| `npm run crawl:hours:propagate`              | 同一電話番号・住所への伝播予定を表示 | ドライラン                               |
| `npm run crawl:hours:propagate -- --apply`   | 矛盾のない同一窓口へ伝播             | 別部署への誤伝播に注意                   |
| `npm run crawl:hours:closed-days`            | 明示情報から休業日補完予定を表示     | ドライラン                               |
| `npm run crawl:hours:closed-days -- --apply` | 確認可能な休業日を反映               | 祝日等を推測しない                       |

`--apply` があるコマンドは、付けない状態が原則です。ドライラン、Git差分、対象件数を確認した後だけ適用します。スクリプトの引数や挙動を変更した場合は、この表も同じコミットで更新してください。

### GitHub Actions

| Action・ワークフロー                   | 用途                            | 使い方                                  |
| -------------------------------------- | ------------------------------- | --------------------------------------- |
| `actions/checkout@v4`                  | CI環境へソースを取得            | ワークフロー内で自動実行                |
| `actions/setup-node@v4`                | Node.js 24とnpmキャッシュを準備 | ワークフロー内で自動実行                |
| [CI](.github/workflows/ci.yml)         | push・PRごとの全品質検査        | GitHubの「Actions」から結果とログを確認 |
| [Uptime](.github/workflows/uptime.yml) | 本番URL、sitemap、301転送の監視 | 5分間隔。Actionsから手動実行も可能      |

ワークフローが赤い状態では公開完了としません。失敗したステップ名を確認し、ローカルで同じコマンドを再現してから修正します。

### 外部サービス

| サービス              | 用途                               | このリポジトリとの接点                    |
| --------------------- | ---------------------------------- | ----------------------------------------- |
| Vercel                | 本番ホスティング、Runtime Logs     | push後のデプロイ、`vercel.json`           |
| GitHub                | ソース管理、レビュー、CI、稼働監視 | `.github/workflows/`                      |
| Google Search Console | インデックス・検索状態の確認       | `GOOGLE_SITE_VERIFICATION`、`sitemap.xml` |
| Supabase（任意）      | CSVの代替データバックエンド        | `DATA_BACKEND=supabase` の場合のみ        |

外部サービスのアカウント、通知先、課金、ドメイン所有権はリポジトリだけでは引き継がれません。運営者交代時は、各サービスの管理者権限と復旧手段を別途引き継いでください。

### Codex・ChatGPTのプラグイン

現時点で、このリポジトリに必須のCodex／ChatGPTプラグインや、共有されたプラグイン設定ファイルはありません。ブラウザ操作、GitHub連携、Google Driveなどのプラグインは各利用者のCodex環境に属し、サイト本体の依存関係ではありません。

AIを使って更新する場合も、生成結果を正データへ直接反映しないでください。必ずGit差分、公式出典、検証コマンドを人が確認します。将来プロジェクト固有のスキルやプラグインを追加した場合は、設定ファイルの場所、目的、必要権限、入力・出力、実行例、無効時の代替手順をこの節へ追記します。

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

## ページ生成ルール

### データから表示まで

```text
data/*.csv
  ↓ CSV解析・Zod検証
lib/data/repository.ts
  ↓ publishedと参照整合性で公開対象を絞り込み
lib/data/view-models.ts / lib/support-routing.ts / lib/seo-content.ts
  ↓ 画面用データ、窓口優先順位、SEO文面を生成
app/**/page.tsx
  ↓
HTML、metadata、JSON-LD、sitemap.xml
```

通常は `data/` のCSVを読みます。`DATA_BACKEND=supabase` の場合だけSupabaseへ切り替わります。どちらの場合も、ページ側は `getPublicPortalData()` を通してデータを取得します。

公開データに含まれる条件:

- 自治体、出典、窓口、制度の `status` が `published`
- 窓口が公開自治体と公開出典を参照している
- 制度が公開出典を参照し、指定された自治体・窓口も公開対象である
- 自治体と制度の関連も、公開自治体・制度・出典を参照している

参照先が非公開または存在しないデータは、単体が `published` でも公開ページへ出しません。

### ルートごとの生成方法

| ルート                                   | 生成内容                                        | 実行方式・更新規則                                                     |
| ---------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `/`                                      | 3STEP検索、全国データのクライアント用表示モデル | ビルド時に静的生成。公開データ全体から生成                             |
| `/support`                               | 47都道府県の一覧                                | ビルド時に静的生成。公開自治体を都道府県別に集計                       |
| `/support/[prefectureCode]`              | 都道府県内の自治体とカテゴリリンク              | リクエスト時にサーバー生成。都道府県コードがなければ404                |
| `/support/[municipalityId]/[categoryId]` | 自治体×困りごとの相談案内                       | リクエスト時に生成・キャッシュし、最大1日単位で再検証。IDがなければ404 |
| `/about`                                 | 運営者、免責、個人情報                          | ビルド時に静的生成                                                     |
| `/corrections`                           | 訂正窓口                                        | ビルド時に静的生成                                                     |
| `/admin/*`                               | クロール・候補審査                              | リクエスト時に生成。Basic認証必須、未設定時は503                       |
| `/api/support`                           | 公開データAPI                                   | リクエスト時に生成。管理用データやdraftを返さない                      |
| `/sitemap.xml`                           | 正規URL一覧                                     | ビルド時に公開データとインデックス条件から生成                         |
| `/robots.txt`                            | クローラー規則                                  | ビルド時に生成。`/admin/` を拒否し、正規sitemapを指定                  |

自治体×カテゴリページは `revalidate = 86_400` のため、生成済みページを最大1日単位で再検証します。URLの基準は自治体IDとカテゴリIDで、名称を変更してもURLを変えません。

### 困りごと文面の生成

カテゴリ名、短い表示名、並び順などのデータ項目は `data/categories.csv` で管理します。検索を意識したタイトル、要約、最初の行動、関連語は `lib/seo-content.ts` のカテゴリ別定義から生成します。

自治体×カテゴリページの基本タイトル:

```text
{自治体名}で{困りごとの検索向け文面}ときの相談先
```

descriptionには都道府県名、自治体名、困りごと、最優先窓口名を含めます。カテゴリを追加するときは、CSVだけでなく `lib/seo-content.ts`、担当部署への取り次ぎ文面、緊急表示、SEO監査も更新してください。

### 窓口の選定と並び順

`lib/support-routing.ts` が自治体内の窓口を次の3種類へ分類します。

1. 専用・直通窓口
2. 生活困窮者自立相談支援機関
3. 自治体代表電話

食料、住まい、公共料金、仕事、借金、相談先不明では、複数の困りごとをまとめて相談できる自立相談を先に表示します。それ以外はカテゴリ専用窓口を先にし、次に自立相談、最後に代表電話を表示します。同じ窓口IDは重複表示しません。

DVカテゴリは安全上の例外です。カテゴリ専用の直通窓口だけを表示し、自治体代表と一般的な自立相談をフォールバック表示しません。直通窓口がない場合も、代表電話で埋めてはいけません。

### 制度の選定

ページでは全国制度と、その自治体に紐づく制度を候補にします。

- カテゴリに直接対応する制度があれば、それを表示
- 直接対応する制度がなければ、生活保護と生活困窮者自立支援の基本制度をフォールバック表示
- 制度の対象可否をサイトが判定・保証する表現は使わない

### SEO・インデックス条件

- canonical、OGP URL、JSON-LD、sitemapは `lib/site.ts` の正規ドメインを使用
- 自治体×カテゴリページは、表示できる窓口が1件以上ある場合だけ `index`
- 窓口がないページは `noindex, follow`
- sitemapには窓口がある自治体×カテゴリだけを含める
- DVは専用・直通窓口が存在する自治体だけをsitemapへ含める
- 都道府県、自治体、カテゴリが存在しないURLは404
- `lastModified` は公開データの最終確認日を使用
- ページ本文とmetadataで異なる根拠・窓口を使わない

新しいページ種別を追加するときは、最低限次を同時に確認します。

```text
[ ] canonicalが正規ドメインを指す
[ ] titleとdescriptionがページ固有
[ ] indexさせるだけの公開情報がある
[ ] sitemapへの追加・除外条件が明示されている
[ ] JSON-LDが画面表示と一致する
[ ] 存在しないIDが404になる
[ ] admin・draft・review_requiredが公開されない
[ ] DV等の安全例外を壊していない
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

- canonical、sitemap、構造化データの本番URLは `https://fukushi.junkbranding.com` に固定
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
npm run municipality-urls:resolve
```

対象を限定するときは `.env.local` の `URL_RESOLVER_CODES` に自治体コードを設定します。URLを自動発見しても、自治体名、公式ドメイン、ページ内容を確認するまで正データにしません。

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

pushとpull requestのたびに [GitHub Actions](.github/workflows/ci.yml) が次を実行します。ローカルでも変更後に同じ検証を行います。

```bash
npm run data:validate
npm run data:quality
npm run data:audit
npm run seo:audit
npm run lint
npm run build
```

それぞれの役割:

| コマンド        | 確認内容                                   |
| --------------- | ------------------------------------------ |
| `data:validate` | CSV形式、Zodスキーマ、参照整合性、必須項目 |
| `data:quality`  | 未登録項目、確認期限、主要項目の品質       |
| `data:audit`    | 1,741自治体の主要4導線と全国整備状況       |
| `seo:audit`     | SEOページ、タイトル、説明、URL生成         |
| `lint`          | TypeScript・React・Next.jsの静的検査       |
| `build`         | 本番コンパイル、型検査、ルート生成         |

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

## 運用ルール

### 役割と正データ

- 公開情報の正データは、通常 `data/` のCSV・JSON
- クロール結果は `data/crawl/` の審査候補であり、正データではない
- `reports/` は監査結果であり、公開データの代わりにしない
- UIへ自治体・窓口・制度を直接書かず、正データと表示ロジックを分離する
- 最終判断者は人。AI、クローラー、外部データの出力だけで公開状態へ変更しない

### 変更の標準フロー

1. 作業前に `git status` を確認し、未完了の変更を把握する
2. 公式一次情報を開き、発行元、対象年度、更新日、対象地域を確認する
3. 対象データと `sourceId`、`lastVerifiedAt` を更新する
4. `git diff` で変更件数、意図しない削除、電話番号・自治体の取り違えを確認する
5. 品質チェックをすべて実行する
6. スマートフォン、キーボード、主要導線を目視確認する
7. 1つの目的に絞ってコミットし、GitHubへpushする
8. GitHub ActionsとVercelデプロイの成功を確認する
9. 本番URLで変更箇所、canonical、外部リンク、電話リンクを確認する

通常の公開コマンド:

```bash
git status
npm run data:validate
npm run data:quality
npm run data:audit
npm run seo:audit
npm run lint
npm run build
git diff --check
```

検証に失敗した状態で、`--no-verify`、検査の削除、型エラーの無視などによって公開を通してはいけません。

### 定期確認

| 頻度         | 確認内容                                                                |
| ------------ | ----------------------------------------------------------------------- |
| 随時         | GitHub ActionsとVercelの失敗通知、訂正メール、重大なリンク切れ          |
| 週次         | Uptimeの履歴、Vercel Runtime Logs、緊急情報の公式告知                   |
| 月次         | Search Consoleのインデックス・サイトマップ・404、出典監視、期限切れ情報 |
| 大規模更新時 | READMEの件数、全データ監査、SEO監査、実機・スクリーンリーダー確認       |
| 運営者交代時 | GitHub、Vercel、ドメイン、Search Console、メールの権限と通知先          |

確認しただけでデータを変更しなかった場合も、重大な問題や判断保留があればIssueまたは運用記録へ残してください。

### 障害・誤情報への対応

優先順位は「利用者の安全に影響する誤情報」→「サイト全体の停止」→「主要導線の不具合」→「表示上の軽微な問題」です。

1. DV、虐待、自殺念慮、緊急連絡先などに危険な誤りがある場合は、該当表示の停止または安全な公式導線への差し替えを優先する
2. Uptimeが失敗したら、GitHub Actions、VercelのDeployment、Runtime Logs、ドメイン状態を確認する
3. 直前の変更が原因でも、履歴を破壊する操作は避け、修正コミットまたはGitHubのrevertで戻す
4. 復旧後にトップ、`/support`、対象自治体ページ、`/sitemap.xml`、旧Vercel URLの301を確認する
5. 原因、影響範囲、復旧内容、再発防止をIssue等へ記録する

緊急時でも、確認できない電話番号や受付時間を推測して掲載してはいけません。

### セキュリティと個人情報

- `.env.local`、APIキー、サービスロールキー、Basic認証情報をコミットしない
- `SUPABASE_SERVICE_ROLE_KEY` をブラウザへ公開しない
- 管理画面を認証なしで公開しない。認証未設定時は503になる設計を維持する
- 訂正メール、ログ、Issueへ相談者の住所、病歴、被害内容などを転載しない
- エラートラッキングへ検索条件や相談内容を送信しない
- 外部URLや取得HTMLを信頼せず、クローラーのURL制限・robots.txt・サニタイズを維持する
- 秘密情報を誤ってpushした場合、Git履歴から消すだけでなく、該当キーを直ちに失効・再発行する

### Git・レビュー

- `main` は常にデプロイ可能な状態を保つ
- データ更新、依存関係更新、UI変更、運用設定を可能な限り別コミットにする
- 大量変更では、変更件数と代表サンプルをコミットまたはPRの説明へ記載する
- 自分以外の変更や未追跡ファイルを、理由なく削除・上書きしない
- force push、履歴書き換え、大量削除は、対象と復旧方法を確認してから行う
- CI成功は必要条件であり、支援情報の内容が正しいことを保証するものではない

## 既知の限界

- すべての窓口に受付時間・休業日があるわけではない
- 公式ページがrobots.txt、403、リンク切れなどで取得できない場合がある
- 住所によって担当窓口が変わる制度を完全自動判定できない
- 祝日、年末年始、臨時閉庁をリアルタイム判定しない
- サイトは支援の提供、相談受付、受給可否の判定を行わない
- 公開後もスマートフォン、低速回線、スクリーンリーダーの継続的な実機確認が必要

## ライセンスと再利用

- ソースコード: [MIT License](LICENSE)
- データベースの構成、独自の説明文、整理・編集部分: [CC BY 4.0](DATA_LICENSE.md)

国、地方公共団体、支援機関など第三者の原資料・文章・画像・ロゴには、このリポジトリのライセンスは適用されません。行政情報を再利用するときは、`sourceId`・`officialUrl` が示す各発行元の利用条件も確認してください。

## 公開・運用チェック

- 正規ドメイン: <https://fukushi.junkbranding.com/>
- `fukushi-portal-gold.vercel.app` へのアクセスは、同じパスとクエリを保って正規ドメインへ301転送
- canonical、sitemap、robots.txt、構造化データは正規ドメインへ固定
- Search Consoleで `https://fukushi.junkbranding.com/sitemap.xml` を送信
- [Uptime workflow](.github/workflows/uptime.yml) がトップ、`/support`、`/sitemap.xml` と301転送を5分間隔で監視
- 予期しない画面エラーは個人情報を含めずVercel Runtime Logsへ記録。GitHub ActionsとVercelの失敗通知を有効にする
