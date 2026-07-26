import assert from "node:assert/strict";
import path from "node:path";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { applyPublicationPreview, type PublishPreview } from "../crawler/publisher";
import { getPortalData } from "../lib/data/repository";

const dataFiles = [
  "prefectures.csv",
  "categories.csv",
  "municipalities.csv",
  "offices.csv",
  "programs.csv",
  "municipality-programs.csv",
  "sources.csv",
] as const;

function officePreview(idSuffix: string): PublishPreview {
  const sourceId = `source-fixture-${idSuffix}`;
  return {
    municipalityCode: "082201",
    municipalityName: "つくば市",
    candidateId: `fixture-${idSuffix}`,
    target: "office",
    entityId: `fixture-office-${idSuffix}`,
    sourceId,
    sourceReused: false,
    source: {
      id: sourceId,
      title: "公開処理テスト用一次情報",
      url: `https://www.city.tsukuba.lg.jp/fixture/${idSuffix}.html`,
      publisher: "つくば市",
      sourceType: "official",
      status: "published",
      lastVerifiedAt: "2026-07-26",
    },
    entity: {
      id: `fixture-office-${idSuffix}`,
      municipalityId: "ibaraki-tsukuba",
      categoryId: "unknown",
      name: "公開処理テスト窓口",
      plainName: "テスト窓口",
      department: "テスト課",
      description: "CSV公開と復元処理を確認するfixtureです。",
      postalCode: "305-8555",
      address: "茨城県つくば市研究学園一丁目1番地1",
      phone: "029-883-1111",
      fax: "",
      email: "",
      contactFormUrl: "",
      officialUrl: "https://www.city.tsukuba.lg.jp/",
      openingHours: "",
      closedDays: "",
      reservationRequired: "",
      availableMethods: "電話",
      accessibility: "",
      languages: "",
      emergencyAlternative: "",
      sourceId,
      status: "published",
      lastVerifiedAt: "2026-07-26",
    },
  };
}

async function main() {
  const temporary = await mkdtemp(path.join(tmpdir(), "fukushi-publish-test-"));
  const projectData = path.join(process.cwd(), "data");
  try {
    await Promise.all(dataFiles.map((file) => copyFile(path.join(projectData, file), path.join(temporary, file))));
    const successful = officePreview("success");
    await applyPublicationPreview(successful, temporary);
    const data = await getPortalData(temporary);
    assert(data.offices.some((item) => item.id === successful.entityId));
    assert(data.sources.some((item) => item.id === successful.sourceId));

    const sourcesBeforeFailure = await readFile(path.join(temporary, "sources.csv"), "utf8");
    const officesBeforeFailure = await readFile(path.join(temporary, "offices.csv"), "utf8");
    const invalid = officePreview("rollback");
    invalid.entity.email = "invalid-email";
    await assert.rejects(() => applyPublicationPreview(invalid, temporary), /CSVを復元しました/);
    assert.equal(await readFile(path.join(temporary, "sources.csv"), "utf8"), sourcesBeforeFailure);
    assert.equal(await readFile(path.join(temporary, "offices.csv"), "utf8"), officesBeforeFailure);
    console.log("公開fixture: 追記成功 / Zod検証失敗時のCSV復元成功");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
