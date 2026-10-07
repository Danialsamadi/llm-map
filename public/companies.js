// Company facts for the overview card: no DOM. Tested by test/companies.test.mjs.
import { betterSign } from './space.js';

// Website and one-line description per company, keyed by the exact Artificial Analysis creator name.
export const COMPANIES = {
  'Anthropic': { url: 'https://www.anthropic.com', about: 'AI safety company in San Francisco that makes the Claude models.' },
  'OpenAI': { url: 'https://openai.com', about: 'San Francisco AI company that makes ChatGPT and the GPT models.' },
};

// facts about one company: { count, newest: model|null, best: [{ key, model }] }
export function companyFacts(models, company, keys) {
  const ms = models.filter(m => m.company === company);
  const newest = ms.reduce((a, m) => (m.release && (!a || m.release > a.release) ? m : a), null);
  const best = keys.flatMap(key => {
    const s = betterSign(key), model = ms.reduce((a, m) => (m[key] != null && (!a || s * m[key] > s * a[key]) ? m : a), null);
    return model ? [{ key, model }] : [];
  });
  return { count: ms.length, newest, best };
}
