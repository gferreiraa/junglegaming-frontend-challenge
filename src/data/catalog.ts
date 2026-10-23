import jacket from '../../design/imagens/8459204731e6eba9d474cbc8ebc37071360d3ba5.png'
import hoodie from '../../design/imagens/2986a7cb16d09de8970824d2dd58bf0bb021702c.png'
import phones from '../../design/imagens/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png'
import blazer from '../../design/imagens/9df2ff42dd27ba657621c304557d1a855a4be6a5.png'

export const nftArt = { jacket, hoodie, phones, blazer }

const imageById: Record<string, string> = {
  'emerald-ape-042': jacket,
  'sage-nomad-009': hoodie,
  'neon-vessel-552': blazer,
  'cosmic-bloom-118': hoodie,
  'violet-nomad-314': hoodie,
  'ivory-baron-088': blazer,
  'golden-beat-207': phones,
  'golden-frequency-071': phones,
  'golden-signal-160': phones,
}

export type Nft = {
  id: string
  title: string
  price: number
  compareAt?: number
  tokenId: string
  collection: string
  collectionSlug: string
  rare?: boolean
  rating: number
  reviews: number
  editions: string[]
  attributes: string[]
  about: string
  details: string
  hue: string
  accent: string
  image: string
  network: 'Ethereum' | 'Polygon' | 'Solana'
  listedAt: number
  trending?: boolean
  fresh?: boolean
}

const nftSeed: Omit<Nft, 'image'>[] = [
  {
    id: 'emerald-ape-042',
    title: 'Emerald Ape #042',
    price: 1.19,
    tokenId: '0042',
    collection: 'Kurio Apes',
    collectionSlug: 'arte-digital',
    rare: true,
    rating: 4.8,
    reviews: 19,
    editions: ['1/1', '1/10', '1/50', 'ABERTA'],
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    about:
      'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
    details:
      'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.\n\nA propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    hue: '#efe4cf',
    accent: '#1f6b45',
    network: 'Ethereum',
    listedAt: 9,
    trending: true,
    fresh: true,
  },
  {
    id: 'sage-nomad-009',
    title: 'Sage Nomad #009',
    price: 1.69,
    tokenId: '0009',
    collection: 'Kurio Apes',
    collectionSlug: 'arte-digital',
    rating: 4.6,
    reviews: 11,
    editions: ['1/1', '1/10', '1/50'],
    attributes: ['Manto', 'Sábio'],
    about: 'Retrato nômade da coleção Kurio Apes, com manto claro e fundo de estúdio.',
    details: 'Sage Nomad #009 faz parte da série de retratos de estúdio. A edição é limitada e a procedência fica registrada na rede escolhida na compra.',
    hue: '#f4efe4',
    accent: '#cbbba4',
    network: 'Ethereum',
    listedAt: 8,
    fresh: true,
  },
  {
    id: 'neon-vessel-552',
    title: 'Neon Vessel #552',
    price: 1.99,
    compareAt: 2.29,
    tokenId: '0552',
    collection: 'Kurio Apes',
    collectionSlug: 'arte-digital',
    rare: true,
    rating: 4.9,
    reviews: 22,
    editions: ['1/1', '1/10'],
    attributes: ['Óculos', 'Neon', 'Raro'],
    about: 'Variação rara com paleta neon e preço de lançamento reduzido.',
    details: 'Neon Vessel #552 é uma peça rara da mesma família visual. O preço riscado mostra o valor anterior ao lançamento.',
    hue: '#f6edd9',
    accent: '#245c40',
    network: 'Ethereum',
    listedAt: 7,
    trending: true,
    fresh: true,
  },
  {
    id: 'cosmic-bloom-118',
    title: 'Cosmic Bloom #118',
    price: 1.29,
    tokenId: '0118',
    collection: 'Kurio Apes',
    collectionSlug: 'colecionaveis',
    rating: 4.4,
    reviews: 8,
    editions: ['1/1', '1/10', 'ABERTA'],
    attributes: ['Chapéu', 'Lilás'],
    about: 'Peça de oferta limitada usada no destaque da home.',
    details: 'Cosmic Bloom #118 aparece como oferta limitada. A edição aberta convive com cortes numerados.',
    hue: '#e7e2d8',
    accent: '#6d5b9a',
    network: 'Polygon',
    listedAt: 6,
    trending: true,
  },
  {
    id: 'violet-nomad-314',
    title: 'Violet Nomad #314',
    price: 1.39,
    tokenId: '0314',
    collection: 'Kurio Apes',
    collectionSlug: 'colecionaveis',
    rating: 4.5,
    reviews: 14,
    editions: ['1/1', '1/10', '1/50'],
    attributes: ['Chapéu', 'Violeta'],
    about: 'Nômade violeta da mesma série dos retratos de estúdio.',
    details: 'Violet Nomad #314 segue o recorte 1/1, 1/10 e 1/50. O subtotal do carrinho multiplica o preço pela quantidade.',
    hue: '#efe6f2',
    accent: '#7a5ea8',
    network: 'Polygon',
    listedAt: 5,
    fresh: true,
  },
  {
    id: 'ivory-baron-088',
    title: 'Ivory Baron #088',
    price: 1.79,
    tokenId: '0088',
    collection: 'Kurio Apes',
    collectionSlug: 'arte-digital',
    rating: 4.7,
    reviews: 16,
    editions: ['1/1', '1/10'],
    attributes: ['Casaco', 'Marfim'],
    about: 'Retrato formal com casaco claro e fundo neutro.',
    details: 'Ivory Baron #088 é uma edição curta. A taxa de rede da simulação permanece fixa em 0.016 ETH.',
    hue: '#f7f1e6',
    accent: '#8d8a84',
    network: 'Ethereum',
    listedAt: 4,
    trending: true,
  },
  {
    id: 'golden-beat-207',
    title: 'Golden Beat #207',
    price: 0.99,
    tokenId: '0207',
    collection: 'Kurio Apes',
    collectionSlug: 'musica',
    rating: 4.3,
    reviews: 9,
    editions: ['1/1', '1/50', 'ABERTA'],
    attributes: ['Fone', 'Dourado'],
    about: 'Peça da coleção musical, com fone e paleta dourada.',
    details: 'Golden Beat #207 entra na coleção Música. O preço fica abaixo de 1 ETH.',
    hue: '#f8efd8',
    accent: '#d7a441',
    network: 'Solana',
    listedAt: 3,
  },
  {
    id: 'golden-frequency-071',
    title: 'Golden Frequency #071',
    price: 0.59,
    tokenId: '0071',
    collection: 'Kurio Apes',
    collectionSlug: 'musica',
    rating: 4.1,
    reviews: 6,
    editions: ['1/10', 'ABERTA'],
    attributes: ['Chapéu', 'Frequência'],
    about: 'Edição acessível da série dourada.',
    details: 'Golden Frequency #071 é a peça de entrada da série. Continua usando o mesmo recorte de edição.',
    hue: '#f3eee6',
    accent: '#b9a48a',
    network: 'Solana',
    listedAt: 2,
    fresh: true,
  },
  {
    id: 'golden-signal-160',
    title: 'Golden Signal #160',
    price: 0.39,
    tokenId: '0160',
    collection: 'Kurio Apes',
    collectionSlug: 'musica',
    rating: 4.2,
    reviews: 7,
    editions: ['1/50', 'ABERTA'],
    attributes: ['Fone', 'Sinal'],
    about: 'Sinal dourado, a peça mais baixa da grade inicial.',
    details: 'Golden Signal #160 fecha a primeira página do mercado. A ordenação recente a coloca por último.',
    hue: '#f6f0e4',
    accent: '#e0b15a',
    network: 'Solana',
    listedAt: 1,
  },
]

export const nfts: Nft[] = nftSeed.map((nft) => ({ ...nft, image: imageById[nft.id] ?? jacket }))

export const collections = [
  { slug: 'arte-digital', name: 'Arte digital', count: 33 },
  { slug: 'fotografia', name: 'Fotografia', count: 12 },
  { slug: 'musica', name: 'Música', count: 65 },
  { slug: 'arte-3d', name: 'Arte 3D', count: 39 },
  { slug: 'colecionaveis', name: 'Colecionáveis', count: 23 },
  { slug: 'generativa', name: 'Generativa', count: 17 },
  { slug: 'jogos', name: 'Jogos', count: 19 },
  { slug: 'assinaturas', name: 'Assinaturas', count: 13 },
  { slug: 'utilidade', name: 'Utilidade', count: 18 },
]

export const networks = [
  { name: 'Ethereum' as const, count: 119 },
  { name: 'Polygon' as const, count: 78 },
  { name: 'Solana' as const, count: 86 },
]

export const articles = [
  {
    id: 'propriedade',
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    summary: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: blazer,
  },
  {
    id: 'artistas',
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    summary: 'Conheça criadores que moldam a cultura digital.',
    image: jacket,
  },
  {
    id: 'raridade',
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    summary: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: hoodie,
  },
  {
    id: 'carteira',
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    summary: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: phones,
  },
]

export function getNft(id: string) {
  return nfts.find((item) => item.id === id)
}

export function formatEth(value: number) {
  const text = value.toFixed(3).replace(/\.?0+$/, '')
  return `${text} ETH`
}
