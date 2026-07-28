import assert from "node:assert/strict";
import test from "node:test";
import { officeDisplayName, officeOrganizationName } from "../lib/office-label";

test("やさしい窓口名と運営機関名を併記する", () => {
  const office = {
    plainName: "生活や仕事の困りごと相談",
    name: "下妻市社会福祉協議会",
  };

  assert.equal(officeDisplayName(office), "生活や仕事の困りごと相談");
  assert.equal(officeOrganizationName(office), "下妻市社会福祉協議会");
});

test("やさしい窓口名がない場合は正式名称を見出しにする", () => {
  const office = { plainName: "", name: "地域相談センター" };

  assert.equal(officeDisplayName(office), "地域相談センター");
  assert.equal(officeOrganizationName(office), "");
});
