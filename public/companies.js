// Company facts for the overview card: no DOM. Tested by test/companies.test.mjs.
import { betterSign } from './space.js';

// Website and one-line description per company, keyed by the exact Artificial Analysis creator name.
export const COMPANIES = {
  'OpenAI': { url: 'https://openai.com/', about: 'A US AI company based in San Francisco that makes the GPT models and the ChatGPT assistant.' },
  'Alibaba': { url: 'https://qwen.ai/', about: 'A Chinese technology group whose Qwen team builds the Qwen family of open and commercial language models.' },
  'Google': { url: 'https://deepmind.google/', about: 'The US tech company whose AI lab, Google DeepMind, builds the Gemini models and the open Gemma models.' },
  'Anthropic': { url: 'https://www.anthropic.com/', about: 'A US AI safety and research company based in San Francisco that makes the Claude family of AI models.' },
  'DeepSeek': { url: 'https://www.deepseek.com/', about: 'A Chinese AI company based in Hangzhou, known for its openly released DeepSeek V and R series language models.' },
  'Mistral': { url: 'https://mistral.ai/', about: 'A French AI company based in Paris that builds open and commercial language models, including Mistral, Magistral and Devstral.' },
  'SpaceXAI': { url: 'https://x.ai/', about: "Elon Musk's AI company, formerly called xAI and now part of SpaceX, which makes the Grok chatbot and models." },
  'Z AI': { url: 'https://z.ai/', about: 'A Beijing-based AI company, formerly known internationally as Zhipu AI, that develops the GLM family of language models.' },
  'Meta': { url: 'https://ai.meta.com/', about: 'The US company behind Facebook and Instagram, whose AI labs created the open Llama models and the Muse Spark models.' },
  'NVIDIA': { url: 'https://www.nvidia.com/', about: 'A US chipmaker based in Santa Clara, California, that also releases open AI models under the Nemotron name.' },
  'Amazon': { url: 'https://nova.amazon.com/', about: 'The US online retail and cloud company, which builds the Amazon Nova family of AI models offered through AWS.' },
  'IBM': { url: 'https://www.ibm.com/granite', about: 'The US technology company that builds Granite, a family of open language models aimed at business use.' },
  'InclusionAI': { url: 'https://www.inclusion-ai.org/', about: 'An open-source AI research group founded by Ant Group, the Chinese fintech company, known for its Ling and Ring language models.' },
  'Kimi': { url: 'https://www.moonshot.ai/', about: 'Moonshot AI, a Beijing-based AI company that makes the Kimi assistant and the Kimi K series of language models.' },
  'Xiaomi': { url: 'https://mimo.xiaomi.com/', about: 'The Chinese smartphone and electronics maker, whose MiMo team develops the MiMo family of language models.' },
  'Allen Institute for AI': { url: 'https://allenai.org/', about: 'A nonprofit AI research institute in Seattle, also called Ai2, known for fully open models such as Olmo and Molmo.' },
  'Liquid AI': { url: 'https://www.liquid.ai/', about: 'An AI company spun out of MIT that builds small, efficient foundation models, called LFMs, designed to run on devices.' },
  'Upstage': { url: 'https://www.upstage.ai/', about: 'A South Korean AI company that builds the Solar language models and document-processing AI for businesses.' },
  'Institute of Foundation Models': { url: 'https://ifm.ai/', about: 'A research institute of MBZUAI, an AI university in Abu Dhabi, that builds fully open language models such as K2.' },
  'LG AI Research': { url: 'https://www.lgresearch.ai/', about: "The AI research arm of South Korea's LG Group, which develops the EXAONE family of language models." },
  'AI21 Labs': { url: 'https://www.ai21.com/', about: 'An Israeli AI company based in Tel Aviv, known for its Jamba language models built for business use.' },
  'MiniMax': { url: 'https://www.minimax.io/', about: 'A Shanghai-based AI company that builds the MiniMax language models along with video, voice and music generation tools.' },
  'Nous Research': { url: 'https://nousresearch.com/', about: 'A US open-source AI research lab known for its Hermes models, which are fine-tuned from other open models.' },
  'Cohere': { url: 'https://cohere.com/', about: 'A Canadian AI company based in Toronto that builds language models for businesses, including the Command and North families.' },
  'Perplexity': { url: 'https://www.perplexity.ai/', about: 'A US company based in San Francisco that makes the Perplexity AI search engine and its Sonar models.' },
  'StepFun': { url: 'https://www.stepfun.com/', about: 'A Shanghai-based AI company that builds the Step family of language and multimodal models.' },
  'China Mobile': { url: 'https://www.chinamobileltd.com/', about: 'A Chinese state-owned telecom operator whose Jiutian research team builds the JT family of language models.' },
  'Microsoft': { url: 'https://www.microsoft.com/', about: 'The US software company based in Redmond, Washington, whose researchers created the Phi family of small language models.' },
  'OpenBMB': { url: 'https://www.openbmb.cn/', about: 'An open-source AI lab linked to Tsinghua University and the Beijing company ModelBest, known for the small MiniCPM models.' },
  'Motif Technologies': { url: 'https://motiftech.io/', about: 'A South Korean AI company, a subsidiary of AI infrastructure firm Moreh, that builds the Motif family of language models.' },
  'Sarvam': { url: 'https://www.sarvam.ai/', about: 'An Indian AI company based in Bengaluru that builds language models for Indian languages, known for its Sarvam models.' },
  'Tencent': { url: 'https://hy.tencent.com/', about: 'The Chinese technology company behind WeChat, which builds the Hy (formerly Hunyuan) family of AI models.' },
  'Baidu': { url: 'https://ernie.baidu.com/', about: 'The Chinese search engine company based in Beijing that develops the ERNIE family of language models.' },
  'ByteDance Seed': { url: 'https://seed.bytedance.com/', about: 'The AI research team of ByteDance, the Chinese company that created TikTok, which builds the Seed and Doubao models.' },
  'Inception': { url: 'https://www.inceptionlabs.ai/', about: 'A Palo Alto AI company that builds the Mercury models, which write text using diffusion, a method also used by image generators.' },
  'Korea Telecom': { url: 'https://corp.kt.com/eng/', about: 'A South Korean telecom operator, also known as KT, that develops the Mi:dm family of Korean language models.' },
  'KwaiKAT': { url: 'https://kwaipilot.github.io/KAT-Coder/', about: 'The KAT coding-model team at Kwaipilot, part of the Chinese video app company Kuaishou, known for its KAT-Coder models.' },
  'LongCat': { url: 'https://longcat.chat/', about: 'The AI model team of Meituan, the Chinese food delivery and local services company, known for its LongCat models.' },
  'Multiverse Computing': { url: 'https://multiversecomputing.com/', about: 'A Spanish company based in San Sebastián that uses quantum-inspired techniques to compress AI models into smaller versions.' },
  'Reka AI': { url: 'https://reka.ai/', about: 'An AI company founded by former Google DeepMind and Meta researchers, building multimodal models such as Reka Flash.' },
  'ServiceNow': { url: 'https://www.servicenow.com/', about: 'A US business software company whose AI research team builds the open Apriel family of language models.' },
  'Swiss AI Initiative': { url: 'https://www.swiss-ai.org/', about: 'A Swiss research effort led by ETH Zurich and EPFL that built Apertus, an open multilingual language model.' },
  'Thinking Machines': { url: 'https://thinkingmachines.ai/', about: 'A San Francisco AI company founded by former OpenAI CTO Mira Murati, which makes the open-weight Inkling models.' },
  'Trillion Labs': { url: 'https://trillionlabs.co/', about: 'A Seoul-based AI startup that builds Tri, a series of open Korean language models trained from scratch.' },
  'Apodex': { url: 'https://www.apodex.ai/', about: 'An AI company building models and agent tools for long, multi-step research and professional work, known for Apodex 1.1.' },
  'Arcee AI': { url: 'https://www.arcee.ai/', about: 'A US AI company that builds open language models, including the Trinity family, and tools to customize them.' },
  'Celeris': { url: 'https://celeris.ai/', about: 'An AI startup founded by the creators of Marqo that builds fast language models using diffusion, starting with Celeris-1.' },
  'Databricks': { url: 'https://www.databricks.com/', about: 'A US data and AI software company based in San Francisco that released the open DBRX language model.' },
  'Deep Cogito': { url: 'https://www.deepcogito.com/', about: 'A San Francisco AI startup known for its open Cogito language models, made by further training other open models.' },
  'Nanbeige': { url: 'https://huggingface.co/Nanbeige', about: 'The language model research team at BOSS Zhipin, a Chinese online recruitment platform, known for its small Nanbeige models.' },
  'Naver': { url: 'https://clova.ai/hyperclova', about: 'The South Korean internet company behind the Naver search portal, which develops the HyperCLOVA X language models.' },
  'Nex AGI': { url: 'https://nex.sii.edu.cn/', about: 'An open-source AI alliance started by the Shanghai Innovation Institute that builds Nex agent models for coding and research.' },
  'OpenChat': { url: 'https://github.com/imoneoi/openchat', about: 'An open-source project, with contributors from Tsinghua University, that fine-tuned open models into the OpenChat chat models.' },
  'Prime Intellect': { url: 'https://www.primeintellect.ai/', about: 'A San Francisco AI company working on decentralized AI training, known for its open INTELLECT models.' },
  'SK Telecom': { url: 'https://www.sktelecom.com/', about: 'A South Korean mobile operator that develops the A.X family of Korean language models.' },
  'Snowflake': { url: 'https://www.snowflake.com/', about: 'A US cloud data company that released Arctic, an open language model aimed at business tasks.' },
  'TII UAE': { url: 'https://www.tii.ae/', about: 'The Technology Innovation Institute, a government-backed research center in Abu Dhabi, known for the open Falcon language models.' },
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
