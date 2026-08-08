import { emergencyContacts } from "@/lib/emergency-contacts";
import { telephoneAriaLabel } from "@/lib/telephone";

export default function EmergencyBanner() {
  const primaryContacts = emergencyContacts.filter((contact) => contact.displayMode === "primary");
  const detailContacts = emergencyContacts.filter((contact) => contact.displayMode === "detail");
  const oldestVerification = emergencyContacts
    .map((contact) => contact.lastVerifiedAt)
    .sort()
    .at(0);
  return (
    <aside className="emergency-banner" aria-label="緊急時の相談先">
      <div className="emergency-inner">
        <div className="emergency-heading">
          <strong>緊急時</strong>
          <a href="https://form.soudanplus.jp/ja" target="_blank" rel="noreferrer">
            声を出せない：DVチャット
          </a>
        </div>
        <div className="emergency-actions">
          {primaryContacts.map((contact) => (
            <div className="emergency-contact" key={contact.number}>
              <a
                href={contact.phoneHref}
                aria-label={telephoneAriaLabel(
                  contact.number,
                  contact.id === "yorisoi-hotline" ? "24時間無料の相談窓口" : contact.label,
                )}
              >
                <strong>{contact.number}</strong>
                <span>
                  {contact.id === "yorisoi-hotline" ? "24時間・無料の相談" : contact.label}
                  <small>
                    {contact.cost}・{contact.availability}
                  </small>
                </span>
              </a>
            </div>
          ))}
        </div>
        <details className="emergency-more">
          <summary>DV・虐待・こころなど</summary>
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
            <small>掲載情報のうち最も古い確認日：{oldestVerification}</small>
          </div>
        </details>
      </div>
    </aside>
  );
}
