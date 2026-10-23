import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { fetchHighlights, fetchNfts } from '@/lib/api/marketplace'
import { formatEth } from '@/lib/money'
import { asDecimalString, parseCollections, type CatalogSearch } from '@/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'

const collections = ['Genesis', 'Aurora', 'Night Market']

export function CatalogPage({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate()
  const highlights = useQuery({
    queryKey: ['highlights'],
    queryFn: ({ signal }) => fetchHighlights(signal),
  })
  const catalog = useQuery({
    queryKey: ['nfts', search],
    queryFn: ({ signal }) => fetchNfts(search, signal),
  })

  function update(patch: Partial<CatalogSearch>, resetPage = true) {
    void navigate({
      to: '/nfts',
      search: (current) => ({
        ...current,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? current.page),
      }),
    })
  }

  const page = search.page ?? 1
  const sort = search.sort ?? 'recent'
  const availability = search.availability ?? 'all'
  const pages = catalog.data ? Math.max(1, Math.ceil(catalog.data.total / catalog.data.pageSize)) : 1
  const selected = parseCollections(search.collections)

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <p className="text-sm text-primary">Coleção simulada</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Marketplace de NFTs</h1>
        <p className="max-w-2xl text-muted">
          Descubra peças, compare edições e conclua uma compra com carteira e rede simuladas.
        </p>
        <form
          className="flex max-w-xl gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const q = String(data.get('q') ?? '').trim()
            update({ q: q || undefined })
          }}
        >
          <Label htmlFor="busca" className="sr-only">
            Buscar NFTs
          </Label>
          <Input key={search.q ?? ''} id="busca" name="q" defaultValue={search.q ?? ''} placeholder="Buscar por nome ou coleção" />
          <Button type="submit">Buscar</Button>
        </form>
      </section>

      <section aria-label="Destaques" className="grid gap-3">
        <h2 className="text-xl font-semibold">Destaques</h2>
        {highlights.isLoading ? <CardSkeletons testId="highlight-skeleton" count={3} /> : null}
        {highlights.isError ? <ErrorBlock onRetry={() => void highlights.refetch()} /> : null}
        {highlights.data && highlights.data.length === 0 ? <p>Nenhum destaque neste cenário.</p> : null}
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.data?.map((nft) => (
            <NftCard key={nft.id} nft={nft} featured />
          ))}
        </div>
      </section>

      <section aria-label="Catálogo" className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Filtros</Button>
            </SheetTrigger>
            <SheetContent aria-describedby="filtros-descricao">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription id="filtros-descricao">Combine coleção, preço e disponibilidade.</SheetDescription>
              <Filters search={{ ...search, availability }} selected={selected} onChange={update} />
            </SheetContent>
          </Sheet>
        </div>
        <aside className="hidden lg:block">
          <h2 className="mb-3 text-lg font-semibold">Filtros</h2>
          <Filters search={{ ...search, availability }} selected={selected} onChange={update} />
        </aside>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p aria-live="polite">
              {catalog.isFetching && !catalog.isLoading ? 'Atualizando catálogo. ' : ''}
              {catalog.data ? `${catalog.data.total} peças` : 'Carregando peças'}
            </p>
            <div className="grid gap-1">
              <Label htmlFor="ordenar">Ordenar</Label>
              <select
                id="ordenar"
                className="h-10 rounded-md border border-border bg-background px-3"
                value={sort}
                onChange={(event) => update({ sort: event.target.value as CatalogSearch['sort'] })}
              >
                <option value="recent">Mais recentes</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
              </select>
            </div>
          </div>
          {catalog.isLoading ? <CardSkeletons testId="catalog-skeleton" count={6} /> : null}
          {catalog.isError ? <ErrorBlock onRetry={() => void catalog.refetch()} /> : null}
          {catalog.data && catalog.data.items.length === 0 ? <p>Nenhum NFT encontrado.</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.data?.items.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
          <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 }, false)}
            >
              Anterior
            </Button>
            <p>
              Página {page} de {pages}
            </p>
            <Button
              variant="outline"
              disabled={page >= pages}
              onClick={() => update({ page: page + 1 }, false)}
            >
              Próxima
            </Button>
          </nav>
        </div>
      </section>
    </div>
  )
}

function Filters({
  search,
  selected,
  onChange,
}: {
  search: CatalogSearch
  selected: string[]
  onChange: (patch: Partial<CatalogSearch>) => void
}) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const minPrice = String(data.get('minPrice') ?? '')
        const maxPrice = String(data.get('maxPrice') ?? '')
        onChange({
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          availability: String(data.get('availability')) as CatalogSearch['availability'],
        })
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Coleção</legend>
        {collections.map((collection) => (
          <label key={collection} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(collection)}
              onChange={() => {
                const next = selected.includes(collection)
                  ? selected.filter((item) => item !== collection)
                  : [...selected, collection]
                onChange({ collections: next.length ? next.join(',') : undefined })
              }}
            />
            {collection}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1">
        <Label htmlFor="minPrice">Preço mínimo</Label>
        <Input id="minPrice" name="minPrice" inputMode="decimal" defaultValue={asDecimalString(search.minPrice) ?? ''} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="maxPrice">Preço máximo</Label>
        <Input id="maxPrice" name="maxPrice" inputMode="decimal" defaultValue={asDecimalString(search.maxPrice) ?? ''} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="availability">Disponibilidade</Label>
        <select
          id="availability"
          name="availability"
          className="h-10 rounded-md border border-border bg-background px-3"
          defaultValue={search.availability}
        >
          <option value="all">Todas</option>
          <option value="available">Com estoque</option>
        </select>
      </div>
      <Button type="submit" variant="outline">
        Aplicar preço
      </Button>
    </form>
  )
}

function NftCard({
  nft,
  featured = false,
}: {
  nft: {
    id: string
    title: string
    imageUrl: string
    collection: string
    editions: Array<{ price: string }>
  }
  featured?: boolean
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block">
        <img
          src={nft.imageUrl}
          alt={nft.title}
          width={800}
          height={800}
          className="aspect-square w-full object-cover"
        />
        <div className="grid gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{nft.title}</h3>
            {featured ? <Badge>Destaque</Badge> : null}
          </div>
          <p className="text-sm text-muted">{nft.collection}</p>
          <p>{formatEth(nft.editions[0]?.price ?? '0')}</p>
        </div>
      </Link>
    </article>
  )
}

function CardSkeletons({ count, testId }: { count: number; testId: string }) {
  return (
    <div data-testid={testId} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando catálogo</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-72" />
      ))}
    </div>
  )
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-danger p-4">
      <p>Não foi possível carregar os dados.</p>
      <Button className="mt-3" variant="outline" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}
