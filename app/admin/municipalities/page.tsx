import MunicipalityAdmin from "@/components/MunicipalityAdmin";
import { getPortalData } from "@/lib/data/repository";
import { toAdminMunicipalities } from "@/lib/data/view-models";
import Link from "next/link";

export default async function MunicipalityAdminPage() {
  const data = await getPortalData();
  return (
    <main id="main" className="page-shell admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">管理確認用</p>
          <h1>自治体データ</h1>
          <p className="lead">公開前のデータを含む整備状況を確認できます。</p>
        </div>
        <Link href="/">利用者向け画面へ</Link>
      </header>
      <MunicipalityAdmin municipalities={toAdminMunicipalities(data)} />
    </main>
  );
}
