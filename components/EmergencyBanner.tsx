import { emergencyContacts } from "@/lib/emergency-contacts";
import { telephoneAriaLabel } from "@/lib/telephone";

export default function EmergencyBanner() {
  const primaryContacts = emergencyContacts.filter((contact) => contact.displayMode === "primary");
  const detailContacts = emergencyContacts.filter((contact) => contact.displayMode === "detail");
  const latestVerification = emergencyContacts
    .map((contact) => contact.lastVerifiedAt)
    .sort()
    .at(-1);
  return (
    <aside className="emergency-banner" aria-label="緊急時の相談先">
      <div className="emergency-inner">
        <div className="emergency-heading">
          <strong>緊急時の相談先</strong>
          <a href="https://form.soudanplus.jp/ja" target="_blank" rel="noreferrer">
            声を出せないとき：DVチャット
          </a>
        </div>
        <div className="emergency-actions">
          {primaryContacts.map((contact) => (
            <div className="emergency-contact" key={contact.number}>
              <a
                href={contact.phoneHref}
                aria-label={telephoneAriaLabel(contact.number, contact.label)}
              >
                <strong>{contact.number}</strong>
                <span>
                  {contact.label}
                  <small>
                    {contact.cost}・{contact.availability}
                  </small>
                </span>
              </a>
            </div>
          ))}
        </div>
        <details className="emergency-more">
          <summary>電話・チャットなどを選ぶ</summary>
          <div className="emergency-detail">
            {detailContacts.map((contact) => (
              <p key={contact.id}>
                <span>{contact.label}</span>
                <a
                  href={contact.phoneHref}
                  aria-label={telephoneAriaLabel(contact.number, contact.label)}
                >
                  {contact.number}
                </a>
                <small>
                  {contact.cost}・{contact.availability}
                </small>
                <a href={contact.officialUrl} target="_blank" rel="noreferrer">
                  {contact.publisher}
                </a>
              </p>
            ))}
            <div className="non-phone-support">
              <strong>声を出せない・電話できないとき</strong>
              <a href="https://form.soudanplus.jp/ja" target="_blank" rel="noreferrer">
                DV相談＋ チャット（12時～22時）
              </a>
              <a href="https://form.soudanplus.jp/mail" target="_blank" rel="noreferrer">
                DV相談＋ メール（24時間受付）
              </a>
              <a
                href="https://www.mhlw.go.jp/mamorouyokokoro/soudan/sns/"
                target="_blank"
                rel="noreferrer"
              >
                厚生労働省 SNS・チャット相談一覧
              </a>
            </div>
            <ul>
              {primaryContacts.map((contact) => (
                <li key={contact.id}>
                  <a href={contact.officialUrl} target="_blank" rel="noreferrer">
                    {contact.label}の公式情報
                  </a>
                </li>
              ))}
            </ul>
            <small>情報確認日：{latestVerification}</small>
          </div>
        </details>
      </div>
    </aside>
  );
}
