import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeUrl, isPrivateIp } from "../crawler/security";
import { serializeJsonLd } from "../lib/json-ld";

test("SSRFに利用できる特殊用途IPとIPv4射影IPv6を拒否する", () => {
  for (const address of [
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "0.0.0.1",
    "100.64.1.1",
    "192.0.0.1",
    "198.18.0.1",
    "127.0.0.1",
    "::1",
  ]) {
    assert.equal(isPrivateIp(address), true, address);
  }
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("2001:4860:4860::8888"), false);
});

test("URLに直接指定された特殊用途IPを拒否する", async () => {
  await assert.rejects(assertSafeUrl("http://[::ffff:127.0.0.1]/"), /安全でないIP/);
  await assert.rejects(assertSafeUrl("http://169.254.169.254/latest/meta-data"), /安全でないIP/);
});

test("JSON-LD内のscript終了文字列を無害化する", () => {
  const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.equal(serialized.includes("<"), false);
  assert.match(serialized, /\\u003c\/script>/);
});
