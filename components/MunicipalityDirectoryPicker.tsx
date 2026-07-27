"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type MunicipalityOption = {
  id: string;
  name: string;
  nameKana: string;
};

type CategoryOption = {
  id: string;
  searchTitle: string;
};

type MunicipalityDirectoryPickerProps = {
  municipalities: MunicipalityOption[];
  categories: CategoryOption[];
};

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase("ja");
}

export default function MunicipalityDirectoryPicker({
  municipalities,
  categories,
}: MunicipalityDirectoryPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const sortedMunicipalities = useMemo(
    () =>
      [...municipalities].sort((a, b) =>
        (a.nameKana || a.name).localeCompare(b.nameKana || b.name, "ja"),
      ),
    [municipalities],
  );
  const filteredMunicipalities = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return sortedMunicipalities;
    return sortedMunicipalities.filter((municipality) =>
      normalizeSearch(`${municipality.name}${municipality.nameKana}`).includes(normalizedQuery),
    );
  }, [query, sortedMunicipalities]);
  const selectedMunicipality = municipalities.find((item) => item.id === selectedId);

  return (
    <section className="municipality-picker" aria-labelledby="municipality-picker-title">
      <h2 id="municipality-picker-title">市区町村を選ぶ</h2>
      <p>市区町村名を入力して絞り込むか、五十音順の一覧から選んでください。</p>
      <div className="municipality-picker-controls">
        <label>
          <span>市区町村名で検索</span>
          <input
            type="search"
            value={query}
            placeholder="例：水戸市"
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId("");
            }}
          />
        </label>
        <label>
          <span>五十音順から選択</span>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">
              {filteredMunicipalities.length
                ? `${filteredMunicipalities.length}自治体から選択`
                : "該当する自治体がありません"}
            </option>
            {filteredMunicipalities.map((municipality) => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" aria-live="polite">
        {filteredMunicipalities.length}自治体を表示しています。
      </p>

      <ul className="municipality-list">
        {filteredMunicipalities.map((municipality) => (
          <li key={municipality.id}>
            <Link href={`/support/${municipality.id}/unknown`}>{municipality.name}</Link>
          </li>
        ))}
      </ul>

      {selectedMunicipality ? (
        <div className="selected-municipality">
          <h3>{selectedMunicipality.name}の困りごと</h3>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/support/${selectedMunicipality.id}/${category.id}`}>
                  {category.searchTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="municipality-picker-empty" role="status">
          市区町村を選ぶと、その自治体の困りごと別ページを表示します。
        </p>
      )}
    </section>
  );
}
