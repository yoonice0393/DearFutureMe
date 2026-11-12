export type FaqItem = { q: string; a: string; home?: boolean };

export const FAQ: FaqItem[] = [
  {
    q: "Do I need an account?",
    a: "No. At an event booth you only need your email address. On the website you can sign in with a one-time link we email you, so there's no password to remember. Signing in lets you see your sealed letters, drafts and opened letters in one place.",
    home: true,
  },
  {
    q: "When can my letter arrive?",
    a: "Pick 6 months, 1, 2, 3, 5 or 10 years, or choose your own date between one month and 25 years from today. We send it on that day. On very busy days it may arrive a day or two later.",
    home: true,
  },
  {
    q: "Can anyone else read my letter?",
    a: "No one browses letters, including us. Letters are encrypted before they're stored, our admin tools never show letter content, and the only time a letter is decrypted is when it's sent to you, or when you open it yourself after signing in. Event staff see counts, never letters or email addresses.",
    home: true,
  },
  {
    q: "Is it end-to-end encrypted?",
    a: "Not in the strict sense. To email the letter to you, our sending service has to decrypt it at that moment, and the email itself travels like any other email. We chose this so you don't need a key or password to get your letter back years from now. If a letter would be dangerous in the wrong hands, keep it offline.",
  },
  {
    q: "What if I typed my email wrong?",
    a: "We show your address in large text before sealing so you can check it, and suggest a fix if the domain looks like a typo. Right after you submit, we send a receipt. If it never arrives, write again with the correct address. If someone else used your address, the receipt has a \"This wasn't me\" link that cancels the letter.",
    home: true,
  },
  {
    q: "Can I change or cancel a letter?",
    a: "Yes. Every receipt has a link to cancel the letter. If you're signed in, you can also reschedule or delete it from your dashboard. If you chose to seal a letter shut, you can still cancel or delete it, just not read it early.",
  },
  {
    q: "What if my email address changes in five years?",
    a: "Sign in and update your email in Settings before then. If you wrote at a booth without an account, use the manage link in your receipt. If the address stops working and we can't reach you, the letter can't be delivered, so keep a copy of anything important.",
  },
  {
    q: "Is it free?",
    a: "Yes. There are no ads and we don't sell data. The site runs on free hosting plans, which is part of why we ask you to keep your own copy of anything you can't afford to lose.",
  },
  {
    q: "What happens if DearFutureMe shuts down?",
    a: "We'll try to deliver your letters early, or at least email you so you can save them. The Terms explain this.",
  },
  {
    q: "Can I write a letter to someone else?",
    a: "Not yet. Letters only go to an address you own. Sending to someone else's address is against the Terms.",
  },
  {
    q: "How long do you keep my letter after it arrives?",
    a: "If you have an account, it stays in your Opened archive until you delete it. Letters written without an account are deleted 90 days after delivery.",
  },
];
