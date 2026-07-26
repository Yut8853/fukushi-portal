import { emergencyContacts } from "@/lib/emergency-contacts";

export default function EmergencyBanner() {
  const primaryContacts = emergencyContacts.filter((contact) => contact.displayMode === "primary");
  const detailContacts = emergencyContacts.filter((contact) => contact.displayMode === "detail");
  const latestVerification = emergencyContacts.map((contact) => contact.lastVerifiedAt).sort().at(0);
  return (
    <aside className="emergency-banner" aria-label="緊急時の相談先">
      <div className="emergency-inner">
        <div className="emergency-heading">
          <strong>いま危険があるとき</strong>
          <span>ためらわず電話してください</span>
        </div>
        <div className="emergency-actions">
          {primaryContacts.map((contact) => (
            <div className="emergency-contact" key={contact.number}>
              <span>{contact.label}</span>
              <a href={contact.phoneHref} aria-label={`${contact.label} ${contact.number}へ電話`}>
                {contact.number}
              </a>
              <a className="emergency-source" href={contact.officialUrl} target="_blank" rel="noreferrer">
                公式情報
              </a>
            </div>
          ))}
        </div>
        {detailContacts.map((contact) => (
          <details className="emergency-more" key={contact.id}>
            <summary>{contact.label}</summary>
            <p>こころの健康相談統一ダイヤル：<a href={contact.phoneHref}>{contact.number}</a></p>
            <a href={contact.officialUrl} target="_blank" rel="noreferrer">{contact.publisher}の公式情報</a>
          </details>
        ))}
        <span className="emergency-verified">確認日 {latestVerification}</span>
      </div>
    </aside>
  );
}
