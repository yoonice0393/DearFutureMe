// Email template tests: escaping, links, postmark line, plain-text twins.
import { test } from "node:test";
import assert from "node:assert/strict";

import { escapeHtml, formatDate, letterEmail, receiptEmail, verifyEmail } from "../supabase/functions/_shared/mail/templates.ts";

const urls = {
  manageUrl: "https://dearfutureme.pages.dev/manage/abc",
  notMeUrl: "https://dearfutureme.pages.dev/manage/abc?action=not-me",
  unsubscribeUrl: "https://dearfutureme.pages.dev/manage/xyz?action=unsubscribe",
};

test("escapeHtml neutralises markup", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">&'`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
});

test("letter email escapes the writer's text and keeps their line breaks", () => {
  const m = letterEmail({
    subject: "Hi <me>",
    body: "Dear me,\n\n<script>alert('x')</script>\nsecond line",
    writtenOn: "November 12, 2026",
    deliveredOn: "November 12, 2027",
    eventName: "Campus <Fair>",
    writeBackUrl: "https://dearfutureme.pages.dev/write",
    unsubscribeUrl: urls.unsubscribeUrl,
  });
  assert.ok(!m.html.includes("<script>"), "no raw script tag");
  assert.ok(m.html.includes("&lt;script&gt;"), "script is escaped");
  assert.ok(m.html.includes("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;<br>second line"), "single newline becomes <br>");
  assert.ok(m.html.includes("Written at Campus &lt;Fair&gt; on November 12, 2026 · Delivered on November 12, 2027"), "postmark line");
  assert.equal(m.subject, "Hi <me>", "subject is a header, not HTML; the provider encodes it");
  assert.ok(m.text.includes("<script>alert('x')</script>"), "plain text keeps the original words");
  assert.ok(m.text.includes("Write back to your future self: https://dearfutureme.pages.dev/write"));
});

test("receipt has manage, not-me and unsubscribe links in both versions", () => {
  const m = receiptEmail({ arrives: "November 12, 2027", eventName: null, ...urls });
  for (const u of Object.values(urls)) {
    assert.ok(m.html.includes(escapeHtml(u)), `html has ${u}`);
    assert.ok(m.text.includes(u), `text has ${u}`);
  }
  assert.match(m.subject, /arrives on November 12, 2027/);
});

test("templates refuse non-http links", () => {
  assert.throws(() => verifyEmail({ verifyUrl: "javascript:alert(1)", arrives: "x", unsubscribeUrl: urls.unsubscribeUrl }));
});

test("dates render in the writer's timezone", () => {
  const d = new Date("2027-11-12T01:00:00Z"); // 09:00 in Manila
  assert.equal(formatDate(d, "Asia/Manila"), "November 12, 2027");
  assert.equal(formatDate(d, "America/Los_Angeles"), "November 11, 2027");
  assert.equal(formatDate(d, "Not/AZone"), "November 12, 2027", "bad timezone falls back to UTC");
});
