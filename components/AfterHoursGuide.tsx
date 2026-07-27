export default function AfterHoursGuide({ categoryId }: { categoryId: string }) {
  return (
    <aside className="after-hours-guide">
      <p className="section-kicker">いま夜・土日で、地域の窓口が閉まっている方へ</p>
      <h3>次に窓口が開くまで、ひとりで抱えなくて大丈夫です</h3>
      <p>
        地域窓口の受付時間は下の各案内で確認してください。時間が未掲載の場合、
        役所関係の窓口は平日の日中だけの場合が多いため、公式ページでも確認してください。
      </p>
      {(categoryId === "food" ||
        categoryId === "housing" ||
        categoryId === "money" ||
        categoryId === "unknown") && (
        <p>
          今夜の食事・居場所・生活に困っている場合は、無料・24時間の
          <a href="tel:0120279338"> よりそいホットライン 0120-279-338</a>にも相談できます。
          食料や宿泊の提供が必ず受けられることを保証する窓口ではありません。
        </p>
      )}
      <p>
        命や身体に差し迫った危険がある場合は、待たずに
        <a href="tel:110">110番</a>または<a href="tel:119">119番</a>を利用してください。
      </p>
      <p className="note">
        朝になったら、このページをもう一度開き、最初に表示された地域窓口へ連絡してください。
      </p>
    </aside>
  );
}
