import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { CatalogSearch } from '@/contracts'
import heroJacket from '../../../design/imagens/8459204731e6eba9d474cbc8ebc37071360d3ba5.png'
import heroHood from '../../../design/imagens/2986a7cb16d09de8970824d2dd58bf0bb021702c.png'
import heroHeadphones from '../../../design/imagens/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png'
import { articles, collections, networks, nftArt, nfts } from '@/data/catalog'
import { CarouselDots, Pagination, UnderlineTabs } from '@/components/kurio/bits'
import { NftCard } from '@/components/kurio/nft-card'
import { NftArt } from '@/components/kurio/portrait'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { AuthDialog } from '@/features/kurio/auth-dialog'
import filterIcon from '../../../design/icons/Filter.svg?url'

type Tab = 'todos' | 'novos' | 'alta'

export function HomePage({ auth, search }: { auth?: 'login' | 'signup'; search: CatalogSearch }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('todos')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState(0.82)
  const [maxPrice, setMaxPrice] = useState(12.3)
  const [applied, setApplied] = useState({ min: 0, max: 100 })
  const priceFloor = 0
  const priceCeil = 13

  const filtered = useMemo(() => {
    return nfts
      .filter((nft) => (tab === 'novos' ? nft.fresh : tab === 'alta' ? nft.trending : true))
      .filter((nft) => (query ? `${nft.title} ${nft.collection}`.toLowerCase().includes(query.toLowerCase()) : true))
      .filter((nft) => (selectedCollections.length ? selectedCollections.includes(nft.collectionSlug) : true))
      .filter((nft) => (selectedNetworks.length ? selectedNetworks.includes(nft.network) : true))
      .filter((nft) => nft.price >= applied.min && nft.price <= applied.max)
      .sort((a, b) => b.listedAt - a.listedAt)
  }, [applied.max, applied.min, query, selectedCollections, selectedNetworks, tab])

  const pageSize = 9
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const featured = nfts[3]
  const [heroSlide, setHeroSlide] = useState(0)
  const heroSlides = [
    { src: heroJacket, alt: 'Emerald Ape #042' },
    { src: heroHood, alt: 'Cosmic Bloom #118' },
    { src: heroHeadphones, alt: 'Golden Beat #207' },
  ]

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
    setPage(1)
  }

  const priceLabel = `${minPrice.toFixed(2).replace('.', ',')} – ${maxPrice.toFixed(2).replace('.', ',')} ETH`
  const minPct = ((minPrice - priceFloor) / (priceCeil - priceFloor)) * 100
  const maxPct = ((maxPrice - priceFloor) / (priceCeil - priceFloor)) * 100

  const filters = (
    <div className="grid gap-2 rounded-lg bg-surface-card p-5">
      <section>
        <h2 className="text-body font-bold">Coleções</h2>
        <ul>
          {collections.map((collection) => {
            const selected = selectedCollections.includes(collection.slug)
            return (
              <li key={collection.slug}>
                <button
                  type="button"
                  aria-pressed={selected}
                  className="btn btn-quiet group flex w-full items-center justify-between text-list"
                  onClick={() => toggle(selectedCollections, collection.slug, setSelectedCollections)}
                >
                  <span className={selected ? 'text-text-accent' : 'text-text-secondary transition-colors duration-200 group-hover:text-text-accent'}>{collection.name}</span>
                  <span className="text-text-muted">({collection.count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="mt-4">
        <h2 className="text-body font-bold">Faixa de preço</h2>
        <div className="relative mt-4 h-4">
          <div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-border" />
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <input
            className="dual-range"
            type="range"
            min={priceFloor}
            max={priceCeil}
            step={0.01}
            value={minPrice}
            aria-label="Preço mínimo"
            onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice))}
          />
          <input
            className="dual-range"
            type="range"
            min={priceFloor}
            max={priceCeil}
            step={0.01}
            value={maxPrice}
            aria-label="Preço máximo"
            onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))}
          />
        </div>
        <p className="mt-3 text-caption text-text-secondary">Preço: {priceLabel}</p>
        <button
          type="button"
          className="btn btn-fill mt-3 h-9 rounded-sm bg-primary px-4 text-caption font-bold text-ink"
          onClick={() => {
            setApplied({ min: Math.min(minPrice, maxPrice), max: Math.max(minPrice, maxPrice) })
            setPage(1)
          }}
        >
          Aplicar
        </button>
      </section>
      <section className="mt-4">
        <h2 className="text-body font-bold">Rede</h2>
        <ul>
          {networks.map((network) => {
            const selected = selectedNetworks.includes(network.name)
            return (
              <li key={network.name}>
                <button
                  type="button"
                  aria-pressed={selected}
                  className="btn btn-quiet group flex w-full items-center justify-between text-list"
                  onClick={() => toggle(selectedNetworks, network.name, setSelectedNetworks)}
                >
                  <span className={selected ? 'text-text-accent' : 'text-text-secondary transition-colors duration-200 group-hover:text-text-accent'}>{network.name}</span>
                  <span className="text-text-muted">({network.count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )

  return (
    <div>
      <AuthDialog auth={auth} />
      <section className="relative hidden lg:block">
        <div className="container-kurio grid items-center gap-12 py-16 pb-20 lg:grid-cols-2">
          <div className="max-w-[540px]">
            <p className="text-body-lg text-text-primary">Bem-vindo à Kurio</p>
            <h1 className="mt-4 text-display font-bold uppercase">
              Seja dono do futuro
              <br />
              da arte digital
            </h1>
            <p className="mt-5 max-w-md text-body text-text-secondary">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
            </p>
            <a href="#mercado" className="btn btn-fill mt-8 inline-flex h-11 items-center rounded-sm bg-primary px-6 text-body-lg font-bold text-ink uppercase">
              Explorar
            </a>
          </div>
          <img
            src={heroSlides[heroSlide]?.src}
            alt={heroSlides[heroSlide]?.alt ?? ''}
            className="ml-auto aspect-square w-full max-w-[460px] rounded-lg object-cover"
          />
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <CarouselDots count={heroSlides.length} active={heroSlide} onSelect={setHeroSlide} />
        </div>
      </section>

      <section className="px-6 pt-6 lg:hidden">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
            setQuery(q)
            setPage(1)
            void navigate({ to: '/', search: (current) => ({ ...current, q: q || undefined, page: 1 }) })
          }}
        >
          <label className="sr-only" htmlFor="explorar">
            Explorar coleções
          </label>
          <input id="explorar" name="q" defaultValue={search.q ?? ''} placeholder="Explorar coleções" className="h-12 flex-1 rounded-full border border-border bg-surface-card px-4" />
          <Sheet>
            <SheetTrigger className="btn btn-fill grid size-12 shrink-0 place-items-center rounded-[14px] bg-primary text-ink" aria-label="Abrir recortes da vitrine">
              <img src={filterIcon} alt="" className="size-[22px]" />
            </SheetTrigger>
            <SheetContent className="bg-surface-card text-text-primary">
              <SheetTitle>Filtros</SheetTitle>
              {filters}
            </SheetContent>
          </Sheet>
        </form>
        <div className="mt-4 overflow-hidden rounded-xl bg-surface-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption text-text-secondary">Bem-vindo à Kurio</p>
              <h1 className="mt-2 text-h3 leading-[1.15] font-bold uppercase">Seja dono da cultura digital</h1>
              <p className="mt-2 text-caption text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
              <a href="#mercado" className="btn btn-line mt-4 inline-flex text-caption font-bold text-text-accent">
                EXPLORAR →
              </a>
            </div>
            <div className="relative size-[112px] shrink-0">
              <img src={heroJacket} alt="" className="size-full rounded-2xl object-cover" />
              <img
                src={heroHood}
                alt=""
                className="absolute -bottom-2 -left-3 size-[58px] rounded-2xl border-[3px] border-surface-card object-cover"
              />
            </div>
          </div>
          <div className="mt-4">
            <CarouselDots count={3} active={0} />
          </div>
        </div>
      </section>

      <section id="mercado" className="container-kurio grid gap-8 py-16 lg:grid-cols-[270px_1fr] lg:py-24">
        <aside className="hidden lg:block">
          {filters}
          <article className="mt-4 rounded-lg bg-surface-card p-5 text-center">
            <p className="text-body font-bold text-text-accent">NFT EM DESTAQUE</p>
            <p className="mt-2 text-body font-bold">OFERTA LIMITADA</p>
            <NftArt src={featured.image} alt={featured.title} className="mt-4 aspect-square w-full rounded-lg" />
          </article>
        </aside>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <UnderlineTabs
              tabs={[
                { id: 'todos', label: 'Todos os NFTs' },
                { id: 'novos', label: 'Novos lançamentos' },
                { id: 'alta', label: 'Em alta' },
              ]}
              value={tab}
              onChange={(value) => {
                setTab(value)
                setPage(1)
              }}
            />
            <p className="text-caption text-text-muted">Ordenar por: Listados recentemente</p>
          </div>
          <div className="mt-6 columns-2 gap-4 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:gap-y-8">
            {visible.map((nft) => (
              <div key={nft.id} className="mb-6 lg:mb-0">
                <NftCard nft={nft} masonry />
              </div>
            ))}
          </div>
          {visible.length === 0 ? <p className="mt-6 text-text-secondary">Nenhuma peça neste recorte.</p> : null}
          <div className="mt-8">
            <Pagination page={page} pages={pages} onChange={setPage} />
          </div>
        </div>
      </section>

      <section className="container-kurio grid gap-4 lg:grid-cols-2">
        <article className="grid items-center gap-4 rounded-lg bg-surface-card p-4 sm:grid-cols-[200px_1fr]">
          <NftArt src={nftArt.jacket} alt="" className="aspect-square w-full rounded-lg" />
          <div className="px-2 py-4 text-center sm:pr-4 sm:text-left">
            <h2 className="text-body-lg font-bold">Lançamentos gênesis de edição limitada</h2>
            <p className="mt-3 text-caption text-text-secondary">Colecione edições escassas diretamente dos criadores antes da revelação pública.</p>
            <a href="#mercado" className="btn btn-fill mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-4 text-caption font-bold text-ink">
              Explorar →
            </a>
          </div>
        </article>
        <article className="grid items-center gap-4 rounded-lg bg-surface-card p-4 sm:grid-cols-[200px_1fr]">
          <NftArt src={nftArt.blazer} alt="" className="aspect-square w-full rounded-lg" />
          <div className="px-2 py-4 text-center sm:pr-4 sm:text-left">
            <h2 className="text-body-lg font-bold">Arte digital selecionada e muito mais</h2>
            <p className="mt-3 text-caption text-text-secondary">Explore novos artistas, coleções verificadas e obras digitais que definem a</p>
            <a href="#mercado" className="btn btn-fill mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-4 text-caption font-bold text-ink">
              Explorar →
            </a>
          </div>
        </article>
      </section>

      <section className="container-kurio py-24 text-center">
        <h2 className="text-h2 font-bold">Diário da Cunhagem</h2>
        <p className="mt-3 text-caption text-text-secondary">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-lg bg-surface-card">
              <NftArt src={article.image} alt="" className="aspect-square w-full" />
              <div className="p-4">
                <p className="text-caption text-text-muted">
                  {article.date} <span aria-hidden="true">|</span> {article.reading}
                </p>
                <h3 className="mt-2 text-body font-bold">{article.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{article.summary}</p>
                <button type="button" className="btn btn-line mt-3 inline-flex text-caption font-bold text-text-accent">
                  Ler mais →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
