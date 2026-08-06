// 自动从官方监控列表提取的公共 SearXNG 实例
const PUBLIC_INSTANCES = [
  'https://search.mectov.my.id',
  'https://search.minus27315.dev',
  'https://search.pereira.is',
  'https://search.pi.vps.pw',
  'https://search.privacyredirect.com',
  'https://search.rhscz.eu',
  'https://search.root.hr',
  'https://search.rowie.at',
  'https://search.sapti.me',
  'https://search.seddens.net',
  'https://search.serpensin.com',
  'https://search.undertale.uk',
  'https://search.unredacted.org',
  'https://search.url4irl.com',
  'https://search.wdpserver.com',
  'https://search.yuri.llc',
  'https://search.zina.dev',
  'https://searx.ankha.ac',
  'https://searx.drayko.xyz',
  'https://searx.dresden.network',
  'https://searx.linxx.net',
  'https://searx.mbuf.net',
  'https://searx.mxchange.org',
  'https://searx.namejeff.xyz',
  'https://searx.oloke.xyz',
  'https://searx.ononoki.org',
  'https://searx.party',
  'https://searx.perennialte.ch',
  'https://searx.redgarden.cv',
  'https://searx.rhscz.eu',
  'https://searx.ro',
  'https://searx.sev.monster',
  'https://searx.thefloatinglab.world',
  'https://searx.tiekoetter.com',
  'https://searx.tsmdt.de',
  'https://searxng.canine.tools',
  'https://searxng.cups.moe',
  'https://searxng.deggo.fyi',
  'https://searxng.eshnetwork.space',
  'https://searxng.fishfvch.com',
  'https://searxng.gdebest.net',
  'https://searxng.gr',
  'https://searxng.moonshadow.dev',
  'https://searxng.paralaxitaentomology.org',
  'https://searxng.shreven.org',
  'https://searxng.site',
  'https://searxng.tr',
  'https://searxng.website',
  'https://searxng.wuemeli.com',
  'https://seek.fyi',
  'https://sx.catgirl.cloud',
  'https://sx.h4rl3y.xyz',
  'https://www.gruble.de',
  'https://xka.cz',
]

export async function searchWeb(query: string): Promise<string> {
  for (const instance of PUBLIC_INSTANCES) {
    try {
      const url = `${instance}/search?format=json&q=${encodeURIComponent(query)}&categories=general&language=zh-CN`
      console.log(`🔍 尝试搜索: ${instance}`)
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      console.log(`📡 ${instance} 状态: ${res.status}`)
      if (!res.ok) continue
      const data = await res.json()
      const results = data.results?.slice(0, 3) || []
      if (results.length === 0) continue
      console.log(`✅ 成功从 ${instance} 获取结果`)
      return results
        .map((r: any, i: number) => `${i + 1}. ${r.title}\n   ${r.content || r.snippet}\n   链接: ${r.url}`)
        .join('\n\n')
    } catch (e) {
      console.warn(`⚠️ ${instance} 失败:`, e)
    }
  }
  console.error('❌ 所有公共实例均不可用')
  return ''
}