// Everything the page says, in English and Persian, and how numbers and dates are written in each. No DOM.
// Model, company and benchmark names stay in Latin script in Persian, as Persian tech writing does.
export const STRINGS = {
  en: {
    brand: 'LLM map',
    count: '{shown} of {total} on the chart',
    'name.intelligence': 'Smartness', 'name.cost': 'Cost per task', 'name.price': 'Price', 'name.speed': 'Speed', 'name.agi': 'ARC-AGI-2', 'name.release': 'Release date',
    'axis.intelligence': 'Smartness (AA index)', 'axis.cost': 'Cost per task ($)', 'axis.price': 'Price ($ per 1M tokens)', 'axis.speed': 'Speed (tokens/s)', 'axis.agi': 'ARC-AGI-2 (% solved)', 'axis.release': 'Release date',
    'about.intelligence': 'Artificial Analysis Intelligence Index: one score from tests of reasoning, coding and knowledge.',
    'about.cost': 'What it cost to run one question of that benchmark, in US dollars.',
    'about.price': 'API price per million tokens, blending 3 parts input to 1 part output.',
    'about.speed': 'How many tokens per second the model writes.',
    'about.agi': 'Share of ARC-AGI-2 puzzles solved. They are easy for people and hard for AI.',
    'about.release': 'When the model came out.',
    'better.higher': 'higher is better', 'better.lower': 'lower is better', 'better.newest': 'newest at the far end',
    'tile.price': 'Price per 1M tokens', 'fmt.price': '{v} per 1M tokens', 'fmt.speed': '{v} tokens/s', 'fmt.speedShort': '{v} tok/s',
    'q.value': 'Smart, cheap or fast?', 'q.value.text': 'Find models that are clever without costing a lot or keeping you waiting.',
    'q.agi': 'How close to AGI?', 'q.agi.text': 'Watch ARC-AGI-2 puzzle scores change with each new release.',
    'q.prices': 'Are prices falling?', 'q.prices.text': 'What each new model charges, with smartness for context.',
    'q.custom': 'Build my own', 'q.custom.text': 'Pick any three measures.',
    axisName: '{axis} axis',
    'status.snapshot': 'Showing a saved copy from {date}. Live data is unavailable right now.',
    'status.now': 'Live data, updated just now.', 'status.ago': 'Live data, updated {when} ago.',
    'unit.minute': '{n} minute', 'unit.minutes': '{n} minutes', 'unit.hour': '{n} hour', 'unit.hours': '{n} hours',
    'rail.aria': 'Controls', grabber: 'Show more or fewer controls', 'chart.aria': '3D chart of language models',
    'h.question': 'Question', 'h.companies': 'Companies',
    'pick.group': 'Quick pick', 'pick.top': 'Top 5', 'pick.all': 'All', 'pick.none': 'None',
    search: 'Search', 'search.aria': 'Search companies', notInView: 'Not in this view', aboutCo: 'About {name}',
    'empty.pick': 'Choose at least one company to see its models.', 'empty.top5': 'Show the top 5 companies',
    'empty.missing': "None of these companies' models have a {measures} score yet. Try another question, or add a company.",
    'empty.missingAll': "None of these companies' models have all three of these measures yet. Try another question, or add a company.",
    'list.or': ' or ', no3d: "Your browser can't show 3D graphics, so the chart can't be drawn here.",
    close: 'Close details', notMeasured: 'Not measured', released: ', released {date}',
    'models.one': '{n} model', 'models.many': '{n} models', newest: ' · newest: {name}, {date}',
    'ctrl.about': 'About this map', 'ctrl.home': 'Reset view', 'ctrl.figure': 'Street View: drag the figure into the chart, or press to choose where to go', 'ctrl.figureTitle': 'Street View',
    'lang.short': 'فا', 'lang.aria': 'فارسی',
    'load.engine': 'Loading the 3D engine…', 'load.models': 'Loading the models…', 'load.drawing': 'Drawing the chart…',
    'load.failed': "The model data didn't load. Check your connection, then reload the page.", 'load.reload': 'Reload',
    'about.h': 'How to use this map', 'about.done': 'Done',
    'about.l1': "Each dot is one AI model. Each line joins one company's models, oldest to newest.",
    'about.l2': 'Drag to turn the chart. Scroll, or pinch on a phone, to zoom.',
    'about.l3': "Click a dot to see all of that model's numbers.",
    'about.l4': 'Drag the yellow figure into the chart to step inside it.',
    'about.l5': 'The link in your address bar keeps your question and companies, so you can share exactly what you see.',
    'about.measures': 'What the measures mean', 'about.sources': 'Where the numbers come from',
    'about.src1': 'Smartness, cost, price, speed and release dates come from ', 'about.src2': '. ARC-AGI-2 scores come from the ',
    'about.arcLink': 'ARC Prize leaderboard', 'about.src3': " and are matched to the same model and effort setting; models ARC hasn't tested have no score.",
    'sv.back': 'Back to overview', 'sv.panel': 'Nearby models', 'sv.menu': 'Step into the chart',
    'sv.stand': 'Stand at a model', 'sv.ride': "Ride a company's line", 'sv.fly': 'Fly around',
    'sv.dropStand': 'Stand at {name}', 'sv.dropRide': "Ride {company}'s line", 'sv.dropFly': 'Fly from here',
    'sv.cancel': 'Cancel', 'sv.tapDot': 'Tap a dot to stand there.', 'sv.tapLine': 'Tap a line, or pick a company:',
    'sv.nearest': 'Nearest models', 'sv.alone': 'No other models on the chart.', 'sv.standing': 'Standing at {name}, {company}',
    'sv.flying': 'Flying freely', 'sv.up': 'Up', 'sv.down': 'Down', 'sv.keys': 'W A S D or arrow keys to move. Space and Shift go up and down.',
    'sv.pause': 'Pause', 'sv.play': 'Play', 'sv.slower': 'Slower', 'sv.faster': 'Faster', 'sv.position': 'Position along the line', 'sv.ahead': 'Look ahead',
    'sv.passing': 'Now passing: {name}, {date}', 'sv.noDate': 'release date unknown',
    'cmp.intelligence.up': 'smarter', 'cmp.intelligence.down': 'less smart', 'cmp.cost.up': 'pricier', 'cmp.cost.down': 'cheaper',
    'cmp.price.up': 'pricier', 'cmp.price.down': 'cheaper', 'cmp.speed.up': 'faster', 'cmp.speed.down': 'slower',
    'cmp.agi.up': 'higher ARC-AGI-2', 'cmp.agi.down': 'lower ARC-AGI-2', 'cmp.release.up': 'newer', 'cmp.release.down': 'older',
    'cmp.much': 'much {w}', 'cmp.bit': 'a bit {w}', 'cmp.same': 'very similar',
    'top.intelligence': 'smartest', 'top.speed': 'fastest', 'top.cost': 'cheapest-to-run', 'top.price': 'lowest-priced',
    'v.oneOf': 'one of the {list} models', 'v.agi': 'among the best at ARC-AGI-2', 'v.join': ', and ',
    'v.good': 'Above average on {list}.', 'v.weak': 'Below average on {list}.', 'v.none': 'About average across the board.',
    'list.comma': ', ', 'list.and': ' and ',
    'rank.top': 'Top {n}%', 'rank.good': 'Above average', 'rank.mid': 'Average', 'rank.low': 'Below average',
  },
  fa: {
    brand: 'نقشه LLM',
    count: '{shown} از {total} مدل روی نمودار',
    'name.intelligence': 'هوشمندی', 'name.cost': 'هزینه هر کار', 'name.price': 'قیمت', 'name.speed': 'سرعت', 'name.agi': 'ARC-AGI-2', 'name.release': 'تاریخ انتشار',
    'axis.intelligence': 'هوشمندی (شاخص AA)', 'axis.cost': 'هزینه هر کار (دلار)', 'axis.price': 'قیمت (دلار برای هر ۱ میلیون توکن)', 'axis.speed': 'سرعت (توکن در ثانیه)', 'axis.agi': 'ARC-AGI-2 (٪ حل‌شده)', 'axis.release': 'تاریخ انتشار',
    'about.intelligence': 'شاخص هوش Artificial Analysis: یک امتیاز از آزمون‌های استدلال، برنامه‌نویسی و دانش.',
    'about.cost': 'هزینه اجرای یک پرسش از آن آزمون، به دلار آمریکا.',
    'about.price': 'قیمت API برای هر یک میلیون توکن، با نسبت ۳ بخش ورودی به ۱ بخش خروجی.',
    'about.speed': 'مدل در هر ثانیه چند توکن می‌نویسد.',
    'about.agi': 'سهم معماهای حل‌شده ARC-AGI-2. این معماها برای آدم‌ها آسان و برای هوش مصنوعی سخت‌اند.',
    'about.release': 'زمانی که مدل عرضه شد.',
    'better.higher': 'بیشتر، بهتر', 'better.lower': 'کمتر، بهتر', 'better.newest': 'جدیدترین در انتها',
    'tile.price': 'قیمت هر ۱ میلیون توکن', 'fmt.price': '{v} برای هر ۱ میلیون توکن', 'fmt.speed': '{v} توکن در ثانیه', 'fmt.speedShort': '{v} توکن/ثانیه',
    'q.value': 'باهوش، ارزان یا سریع؟', 'q.value.text': 'مدل‌هایی را پیدا کنید که باهوش‌اند، بی‌آنکه گران باشند یا منتظرتان بگذارند.',
    'q.agi': 'چقدر به AGI نزدیکیم؟', 'q.agi.text': 'ببینید امتیاز معماهای ARC-AGI-2 با هر مدل تازه چطور تغییر می‌کند.',
    'q.prices': 'آیا قیمت‌ها پایین می‌آیند؟', 'q.prices.text': 'قیمت هر مدل تازه، همراه با هوشمندی‌اش برای مقایسه.',
    'q.custom': 'خودم بسازم', 'q.custom.text': 'هر سه معیاری را که می‌خواهید انتخاب کنید.',
    axisName: 'محور {axis}',
    'status.snapshot': 'نسخه ذخیره‌شده {date} نمایش داده می‌شود. داده‌های زنده فعلاً در دسترس نیست.',
    'status.now': 'داده‌های زنده، همین حالا به‌روز شد.', 'status.ago': 'داده‌های زنده، {when} پیش به‌روز شد.',
    'unit.minute': '{n} دقیقه', 'unit.minutes': '{n} دقیقه', 'unit.hour': '{n} ساعت', 'unit.hours': '{n} ساعت',
    'rail.aria': 'کنترل‌ها', grabber: 'نمایش کنترل‌های بیشتر یا کمتر', 'chart.aria': 'نمودار سه‌بعدی مدل‌های زبانی',
    'h.question': 'پرسش', 'h.companies': 'شرکت‌ها',
    'pick.group': 'انتخاب سریع', 'pick.top': '۵ تای برتر', 'pick.all': 'همه', 'pick.none': 'هیچ‌کدام',
    search: 'جستجو', 'search.aria': 'جستجوی شرکت‌ها', notInView: 'در این نما نیست', aboutCo: 'درباره {name}',
    'empty.pick': 'دست‌کم یک شرکت انتخاب کنید تا مدل‌هایش را ببینید.', 'empty.top5': 'نمایش ۵ شرکت برتر',
    'empty.missing': 'هیچ‌کدام از مدل‌های این شرکت‌ها هنوز امتیاز {measures} ندارند. پرسش دیگری را امتحان کنید یا شرکتی اضافه کنید.',
    'empty.missingAll': 'هیچ‌کدام از مدل‌های این شرکت‌ها هنوز هر سه معیار را ندارند. پرسش دیگری را امتحان کنید یا شرکتی اضافه کنید.',
    'list.or': ' یا ', no3d: 'مرورگر شما نمی‌تواند گرافیک سه‌بعدی نشان دهد، برای همین نمودار اینجا کشیده نمی‌شود.',
    close: 'بستن جزئیات', notMeasured: 'اندازه‌گیری نشده', released: '، منتشرشده در {date}',
    'models.one': '{n} مدل', 'models.many': '{n} مدل', newest: ' · جدیدترین: {name}، {date}',
    'ctrl.about': 'درباره این نقشه', 'ctrl.home': 'بازنشانی نما', 'ctrl.figure': 'نمای خیابانی: آدمک را به داخل نمودار بکشید، یا بزنید تا جایش را انتخاب کنید', 'ctrl.figureTitle': 'نمای خیابانی',
    'lang.short': 'EN', 'lang.aria': 'English',
    'load.engine': 'در حال بارگذاری موتور سه‌بعدی…', 'load.models': 'در حال بارگذاری مدل‌ها…', 'load.drawing': 'در حال کشیدن نمودار…',
    'load.failed': 'داده‌های مدل‌ها بارگذاری نشد. اتصال اینترنت را بررسی کنید و صفحه را دوباره بارگذاری کنید.', 'load.reload': 'بارگذاری دوباره',
    'about.h': 'راهنمای این نقشه', 'about.done': 'تمام',
    'about.l1': 'هر نقطه یک مدل هوش مصنوعی است. هر خط مدل‌های یک شرکت را از قدیمی‌ترین تا جدیدترین به هم وصل می‌کند.',
    'about.l2': 'برای چرخاندن نمودار بکشید. برای بزرگ‌نمایی اسکرول کنید، یا در گوشی دو انگشت را باز و بسته کنید.',
    'about.l3': 'روی یک نقطه بزنید تا همه اعداد آن مدل را ببینید.',
    'about.l4': 'آدمک زرد را به داخل نمودار بکشید تا واردش شوید.',
    'about.l5': 'پیوند نوار نشانی، پرسش و شرکت‌های انتخابی شما را نگه می‌دارد، پس می‌توانید دقیقاً همین نما را با دیگران به اشتراک بگذارید.',
    'about.measures': 'معنی معیارها', 'about.sources': 'این اعداد از کجا می‌آیند',
    'about.src1': 'هوشمندی، هزینه، قیمت، سرعت و تاریخ انتشار از ', 'about.src2': ' می‌آیند. امتیازهای ARC-AGI-2 از ',
    'about.arcLink': 'جدول ARC Prize', 'about.src3': ' می‌آیند و با همان مدل و همان سطح تلاش تطبیق داده شده‌اند؛ مدل‌هایی که ARC آزمایش نکرده امتیازی ندارند.',
    'sv.back': 'بازگشت به نمای کلی', 'sv.panel': 'مدل‌های نزدیک', 'sv.menu': 'وارد نمودار شوید',
    'sv.stand': 'کنار یک مدل بایستید', 'sv.ride': 'روی خط یک شرکت سفر کنید', 'sv.fly': 'آزادانه پرواز کنید',
    'sv.dropStand': 'ایستادن کنار {name}', 'sv.dropRide': 'سفر روی خط {company}', 'sv.dropFly': 'پرواز از اینجا',
    'sv.cancel': 'لغو', 'sv.tapDot': 'روی یک نقطه بزنید تا آنجا بایستید.', 'sv.tapLine': 'روی یک خط بزنید، یا یک شرکت انتخاب کنید:',
    'sv.nearest': 'نزدیک‌ترین مدل‌ها', 'sv.alone': 'مدل دیگری روی نمودار نیست.', 'sv.standing': 'ایستاده کنار {name}، {company}',
    'sv.flying': 'پرواز آزاد', 'sv.up': 'بالا', 'sv.down': 'پایین', 'sv.keys': 'با W A S D یا کلیدهای جهت حرکت کنید. Space و Shift بالا و پایین می‌برند.',
    'sv.pause': 'توقف', 'sv.play': 'پخش', 'sv.slower': 'آهسته‌تر', 'sv.faster': 'تندتر', 'sv.position': 'جایگاه روی خط', 'sv.ahead': 'نگاه به جلو',
    'sv.passing': 'در حال گذر از: {name}، {date}', 'sv.noDate': 'تاریخ انتشار نامعلوم',
    'cmp.intelligence.up': 'باهوش‌تر', 'cmp.intelligence.down': 'کم‌هوش‌تر', 'cmp.cost.up': 'گران‌تر', 'cmp.cost.down': 'ارزان‌تر',
    'cmp.price.up': 'گران‌تر', 'cmp.price.down': 'ارزان‌تر', 'cmp.speed.up': 'سریع‌تر', 'cmp.speed.down': 'کندتر',
    'cmp.agi.up': 'ARC-AGI-2 بالاتر', 'cmp.agi.down': 'ARC-AGI-2 پایین‌تر', 'cmp.release.up': 'جدیدتر', 'cmp.release.down': 'قدیمی‌تر',
    'cmp.much': 'خیلی {w}', 'cmp.bit': 'کمی {w}', 'cmp.same': 'خیلی شبیه',
    'top.intelligence': 'باهوش‌ترین', 'top.speed': 'سریع‌ترین', 'top.cost': 'کم‌هزینه‌ترین', 'top.price': 'ارزان‌ترین',
    'v.oneOf': 'یکی از {list} مدل‌ها', 'v.agi': 'از بهترین‌ها در ARC-AGI-2', 'v.join': ' و ',
    'v.good': 'بالاتر از میانگین در {list}.', 'v.weak': 'پایین‌تر از میانگین در {list}.', 'v.none': 'در همه معیارها نزدیک به میانگین.',
    'list.comma': '، ', 'list.and': ' و ',
    'rank.top': '{n}٪ برتر', 'rank.good': 'بالاتر از میانگین', 'rank.mid': 'میانگین', 'rank.low': 'پایین‌تر از میانگین',
  },
};

export const t = (lang, key, vars = {}) => STRINGS[lang][key].replace(/\{(\w+)\}/g, (_, k) => vars[k]);

export const rankWord = (lang, p) =>
  p >= 90 ? t(lang, 'rank.top', { n: fmt(lang).int(Math.max(1, 100 - p)) }) : t(lang, p >= 60 ? 'rank.good' : p >= 40 ? 'rank.mid' : 'rank.low');

// A model's standout (top 10%), good (60-89) and weak (under 40) measures in plain words. ranks: [key, percentile | null], in display order.
export function verdict(lang, ranks) {
  const band = (lo, hi) => ranks.filter(([, p]) => p != null && p >= lo && p < hi).map(([k]) => k);
  const name = k => { const n = t(lang, 'name.' + k); return n === n.toUpperCase() ? n : n.toLowerCase(); }; // English mid-sentence; keeps ARC-AGI-2
  const list = xs => (xs.length < 2 ? xs[0] : xs.slice(0, -1).join(t(lang, 'list.comma')) + t(lang, 'list.and') + xs.at(-1));
  const best = ranks.filter(([, p]) => p != null && p >= 90).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const adj = best.filter(k => k !== 'agi').map(k => t(lang, 'top.' + k));
  const top = [adj.length && t(lang, 'v.oneOf', { list: list(adj) }), best.includes('agi') && t(lang, 'v.agi')].filter(Boolean).join(t(lang, 'v.join'));
  const good = band(60, 90), weak = band(-Infinity, 40);
  return [top && top[0].toUpperCase() + top.slice(1) + '.', good.length && t(lang, 'v.good', { list: list(good.map(name)) }), weak.length && t(lang, 'v.weak', { list: list(weak.map(name)) })]
    .filter(Boolean).join(' ') || t(lang, 'v.none');
}

// Persian: Persian digits, ٫ for decimals, the dollar written after the amount, Solar Hijri dates (fa-IR's own calendar).
export function fmt(lang) {
  const fa = lang === 'fa', loc = fa ? 'fa-IR' : 'en-US';
  const clean = s => s.replace(/[‎‏؜]/g, ''); // Intl adds direction marks around Persian dates; the page's dir handles that
  const n = (v, o) => clean(new Intl.NumberFormat(loc, o).format(v));
  const d = (iso, o) => clean(new Date(iso + 'T00:00:00Z').toLocaleDateString(loc, { timeZone: 'UTC', ...o }));
  const num = (v, digits) => n(v, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return {
    num,
    int: v => n(Math.round(v)),
    money: v => { const s = v >= 1 ? num(v, 2) : n(v, { maximumSignificantDigits: 2 }); return fa ? s + ' دلار' : '$' + s; },
    pct: v => num(v, 1) + (fa ? '٪' : '%'),
    date: iso => d(iso, { year: 'numeric', month: fa ? 'long' : 'short', day: 'numeric' }),
    month: iso => { // fa-IR's own pattern puts the year first; Persian prose writes «مهر ۱۴۰۵», like the full date
      const p = new Intl.DateTimeFormat(loc, { timeZone: 'UTC', year: 'numeric', month: 'long' }).formatToParts(new Date(iso + 'T00:00:00Z'));
      return clean(['month', 'year'].map(k => p.find(x => x.type === k).value).join(' '));
    },
    digits: s => (fa ? s.replace(/\d/g, c => '۰۱۲۳۴۵۶۷۸۹'[c]).replace('.', '٫') : s), // already-built number text, e.g. the chart's ticks
  };
}
