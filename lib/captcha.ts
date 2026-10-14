/**
 * Shared, framework-agnostic captcha logic.
 * Nothing in here touches React/DOM — safe to import from server actions.
 */

export type CaptchaChallenge = {
  question: string;
  options: { key: string; swatch: string }[];
  tokenTag: string;
};

const PALETTES: { color: string; fa: string; hex: string }[] = [
  { color: "teal", fa: "فیروزه‌ای", hex: "#2fd6c6" },
  { color: "gold", fa: "زرین (طلایی)", hex: "#e6b43e" },
  { color: "lapis", fa: "لاجوردی (آبی)", hex: "#6c93f2" },
  { color: "crimson", fa: "لاکی (قرمز)", hex: "#f0657e" },
  { color: "violet", fa: "بنفش", hex: "#a78bfa" },
  { color: "green", fa: "سبز زمردی", hex: "#34d399" },
];

const SALT = "karvansara-captcha";

export function buildChallenge(): CaptchaChallenge {
  const target = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const shuffled = [...PALETTES].sort(() => Math.random() - 0.5);
  const wrong = shuffled.filter((p) => p.color !== target.color);
  const options = [...wrong.slice(0, 3), target].sort(() => Math.random() - 0.5);
  return {
    question: `کدام رنگ «${target.fa}» است؟`,
    options: options.map((p) => ({ key: p.color, swatch: p.hex })),
    tokenTag: target.color,
  };
}

export function buildToken(answer: string): string {
  let h = 0;
  for (const ch of SALT + answer) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${answer}:${h.toString(36)}`;
}

export function verifyToken(token: string): boolean {
  if (!token) return false;
  const answer = token.split(":")[0] ?? "";
  const expected = buildToken(answer);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
