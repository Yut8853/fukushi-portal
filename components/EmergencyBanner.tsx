import { emergencyContacts } from "@/lib/emergency-contacts";

export default function EmergencyBanner() {
  const primaryContacts = emergencyContacts.filter((contact) => contact.displayMode === "primary");
  const detailContacts = emergencyContacts.filter((contact) => contact.displayMode === "detail");
  const latestVerification = emergencyContacts.map((contact) => contact.lastVerifiedAt).sort().at(0);
  return (
    <aside className="emergency-banner" aria-label="緊急時の相談先">
      <div className="emergency-inner">
        <div className="emergency-heading">
          <strong>いま危険がある</strong>
          <span>すぐに電話</span>
        </div>
        <div className="emergency-actions">
          {primaryContacts.map((contact) => (
            <div className="emergency-contact" key={contact.number}>
              <a href={contact.phoneHref} aria-label={`${contact.label} ${contact.number}へ電話`}>
                <strong>{contact.number}</strong>
                <span>{contact.label}</span>
              </a>
            </div>
          ))}
        </div>
        <details className="emergency-more">
          <summary>こころの相談・出典</summary>
          <div className="emergency-detail">
            {detailContacts.map((contact) => (
              <p key={contact.id}>
                <span>{contact.label}</span>
                <a href={contact.phoneHref}>{contact.number}</a>
                <a href={contact.officialUrl} target="_blank" rel="noreferrer">{contact.publisher}</a>
              </p>
            ))}
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
