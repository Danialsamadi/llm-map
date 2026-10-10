import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, t, fmt, verdict, rankWord } from '../public/i18n.js';

const holes = s => (s.match(/\{\w+\}/g) ?? []).sort().join();

test('every text exists in English and Persian with the same placeholders', () => {
  const en = Object.keys(STRINGS.en), fa = Object.keys(STRINGS.fa);
  assert.deepEqual(fa.filter(k => !en.includes(k)), [], 'Persian keys missing in English');
  assert.deepEqual(en.filter(k => !fa.includes(k)), [], 'English keys missing in Persian');
  for (const k of en) {
    assert.ok(STRINGS.fa[k].trim(), `empty Persian text for ${k}`);
    assert.equal(holes(STRINGS.fa[k]), holes(STRINGS.en[k]), `placeholders differ for ${k}`);
  }
});

test('t fills placeholders in the chosen language', () => {
  assert.equal(t('en', 'count', { shown: '109', total: '697' }), '109 of 697 on the chart');
  assert.equal(t('fa', 'count', { shown: '۱۰۹', total: '۶۹۷' }), '۱۰۹ از ۶۹۷ مدل روی نمودار');
});

test('numbers, money, percentages and dates are written the way each language writes them', () => {
  const en = fmt('en'), fa = fmt('fa');
  assert.deepEqual([en.num(57.6, 1), en.int(1234), en.money(0.19), en.money(1.5625), en.money(0.000123), en.pct(10.3), en.date('2026-10-07'), en.month('2026-10-07')],
    ['57.6', '1,234', '$0.19', '$1.56', '$0.00012', '10.3%', 'Oct 7, 2026', 'October 2026']);
  assert.deepEqual([fa.num(57.6, 1), fa.int(1234), fa.money(0.19), fa.money(1.5625), fa.money(0.000123), fa.pct(10.3), fa.date('2026-10-07'), fa.month('2026-10-07')],
    ['۵۷٫۶', '۱٬۲۳۴', '۰٫۱۹ دلار', '۱٫۵۶ دلار', '۰٫۰۰۰۱۲ دلار', '۱۰٫۳٪', '۱۵ مهر ۱۴۰۵', 'مهر ۱۴۰۵']);
  assert.deepEqual([en.digits('0.01'), fa.digits('0.01'), fa.digits('250')], ['0.01', '۰٫۰۱', '۲۵۰']); // the chart's tick labels
});

test('the verdict names standout, good and weak measures, in either language', () => {
  const cases = [
    [[['intelligence', 50], ['speed', 99]], 'One of the fastest models.', 'یکی از سریع‌ترین مدل‌ها.'],
    [[['intelligence', 95], ['cost', 70], ['price', 20], ['speed', 99], ['agi', null]],
      'One of the fastest and smartest models. Above average on cost per task. Below average on price.',
      'یکی از سریع‌ترین و باهوش‌ترین مدل‌ها. بالاتر از میانگین در هزینه هر کار. پایین‌تر از میانگین در قیمت.'],
    [[['speed', 92], ['agi', 97]], 'One of the fastest models, and among the best at ARC-AGI-2.', 'یکی از سریع‌ترین مدل‌ها و از بهترین‌ها در ARC-AGI-2.'],
    [[['agi', 97]], 'Among the best at ARC-AGI-2.', 'از بهترین‌ها در ARC-AGI-2.'],
    [[['intelligence', 70], ['cost', 65], ['agi', 80]], 'Above average on smartness, cost per task and ARC-AGI-2.', 'بالاتر از میانگین در هوشمندی، هزینه هر کار و ARC-AGI-2.'],
    [[['intelligence', 50], ['agi', null]], 'About average across the board.', 'در همه سنجه‌ها نزدیک به میانگین.'],
  ];
  for (const [ranks, en, fa] of cases) {
    assert.equal(verdict('en', ranks), en);
    assert.equal(verdict('fa', ranks), fa);
  }
});

test('rank badges in either language', () => {
  assert.deepEqual([99, 90, 89, 59, 39].map(p => rankWord('en', p)), ['Top 1%', 'Top 10%', 'Above average', 'Average', 'Below average']);
  assert.deepEqual([99, 90, 89, 59, 39].map(p => rankWord('fa', p)), ['۱٪ برتر', '۱۰٪ برتر', 'بالاتر از میانگین', 'میانگین', 'پایین‌تر از میانگین']);
});
