# SEO・アクセシビリティ改善 リリース確認票

## 自動検証

- `npm run verify`
- `npm run build`
- `npm run test:e2e`
- sitemap、robots、canonical、noindex件数を確認
- 構造化データのJSONがページ本文と一致することを確認

## 人による確認

- `docs/manual-accessibility-checklist.md`を実施
- 14カテゴリの本文と地域導線を確認
- 14制度ガイドを公式出典と照合
- 電話番号、申請期限、緊急連絡先を重点確認
- モバイルで緊急バナー、メニュー、電話リンクを確認

## Search Console

- sitemapを再送信
- `/guide`、主要制度、主要カテゴリ、`/data`をURL検査
- 公開後2〜4週間で過去3か月データを再出力
- 順位5〜20位、表示あり・低CTR、index除外を分けて記録

## 公開後

- エラー監視と404を確認
- 外部レビュー依頼は内容確認を目的に行う
- 指摘と修正根拠を記録する
- noindexページを流入目的で一括indexしない
