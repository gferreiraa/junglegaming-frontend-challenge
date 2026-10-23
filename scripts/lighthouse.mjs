import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { once } from 'node:events'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import * as chromeLauncher from 'chrome-launcher'

const base = 'http://127.0.0.1:4173'
const pages = [
  { name: 'home', path: '/' },
  { name: 'detail', path: '/nfts/nft-01' },
  { name: 'detail-kurio', path: '/nft/emerald-ape-042' },
]
const out = process.env.LH_OUT ?? 'reports/lighthouse'
const profiles = ['mobile', 'desktop']
const runs = 3
const categories = ['performance', 'accessibility', 'best-practices', 'seo']

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitForServer() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base)
      if (response.ok) return
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('O preview não respondeu em 4173')
}

const preview = spawn('pnpm', ['preview'], { stdio: 'inherit' })
mkdirSync(out, { recursive: true })

try {
  await waitForServer()
  const summary = []
  for (const profile of profiles) {
    for (const page of pages) {
      const scores = Object.fromEntries(categories.map((category) => [category, []]))
      const metrics = { lcp: [], cls: [], tbt: [] }
      for (let run = 1; run <= runs; run += 1) {
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
        try {
          const result = await lighthouse(`${base}${page.path}`, {
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'error',
            onlyCategories: categories,
            formFactor: profile,
            screenEmulation:
              profile === 'mobile'
                ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false }
                : { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
          }, profile === 'desktop' ? desktopConfig : undefined)
          const lhr = result.lhr
          for (const category of categories) {
            scores[category].push(Math.round((lhr.categories[category]?.score ?? 0) * 100))
          }
          if (lhr.runtimeError) throw new Error(`${page.name}-${profile}-${run}: ${lhr.runtimeError.code}`)
          metrics.lcp.push(lhr.audits['largest-contentful-paint']?.numericValue ?? 0)
          metrics.cls.push(lhr.audits['cumulative-layout-shift']?.numericValue ?? 0)
          metrics.tbt.push(lhr.audits['total-blocking-time']?.numericValue ?? 0)
          writeFileSync(`${out}/${page.name}-${profile}-${run}.html`, result.report[0])
          writeFileSync(`${out}/${page.name}-${profile}-${run}.json`, result.report[1])
        } finally {
          await chrome.kill()
        }
      }
      summary.push({
        page: page.name,
        profile,
        scores: Object.fromEntries(categories.map((category) => [category, median(scores[category])])),
        lcp: median(metrics.lcp),
        cls: median(metrics.cls),
        tbt: median(metrics.tbt),
      })
    }
  }
  writeFileSync(`${out}/summary.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    url: base,
    node: process.version,
    lighthouse: JSON.parse(readFileSync('node_modules/lighthouse/package.json', 'utf8')).version,
    platform: `${process.platform} ${process.arch}`,
    runs,
    summary,
  }, null, 2))
  console.log(JSON.stringify(summary, null, 2))
} finally {
  preview.kill('SIGTERM')
  await once(preview, 'exit').catch(() => undefined)
}
