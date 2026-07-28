import assert from "node:assert/strict";
import test from "node:test";
import { telephoneAriaLabel, telephoneHref } from "../lib/telephone";

test("電話番号を一桁ずつ読み上げるラベルを生成する", () => {
  assert.equal(
    telephoneAriaLabel("029-221-4166", "茨城県女性相談センター"),
    "茨城県女性相談センター、電話番号 0 2 9、2 2 1、4 1 6 6へ電話",
  );
});

test("電話リンクには表示用の区切り文字を含めない", () => {
  assert.equal(telephoneHref("0120-279-338"), "tel:0120279338");
  assert.equal(telephoneHref("#8008"), "tel:#8008");
});
