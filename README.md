# Jungle Market

Marketplace de NFTs em React e TypeScript. A interface fala só com REST e Socket.IO. No build de demonstração, o MSW responde no browser: não há backend nem blockchain.

## Nota

O Figma passou por várias alterações durante o teste. A pasta `design/`, na raiz do projeto, guarda a referência base usada na implementação: tokens, ícones e as telas exportadas em `design/screens/`.

Faltam telas nesse recorte. O desktop exportado cobre início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras. O mobile exportado cobre início, detalhe, carrinho, pagamento, login e cadastro. Perfil, carteiras e confirmação de pedido não têm frame mobile. Criadores e Aprenda aparecem no cabeçalho e não têm tela própria.

## Setup

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

O mock liga sozinho. Para desligar, crie `.env` com `VITE_ENABLE_MSW=false`. O exemplo está em `.env.example`.

## Credenciais fictícias

| E-mail | Senha | Observação |
| --- | --- | --- |
| collector@example.com | password123 | Maya Chen, com carteiras e um favorito |
| ada@example.com | password123 | Ada Nunes, favorito diferente |

Cupom válido: `WELCOME10`. Cupom expirado: `EXPIRED`.

## Comandos

```bash
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
pnpm lint
pnpm test:e2e
pnpm lighthouse
```

O Playwright sobe o build de preview, gera relatório HTML e guarda trace quando um teste falha. A auditoria Lighthouse mede início e detalhe, três vezes, em mobile e desktop, e grava a mediana em `reports/lighthouse/summary.json`.

## Cenários

“Cenários de demonstração”, abaixo do rodapé e visível também no mobile, chama `POST /api/__control/*`. Os mesmos endpoints servem os testes, sempre a partir da página, para passar pelo service worker.

- `default` é o cenário estável, sem atraso.
- `empty`, `slow`, `out_of_order`, `offline`, `server_error` exercitam o catálogo.
- `session_expired` e o relógio simulado derrubam a sessão.
- `register_conflict`, `coupon_invalid`, `coupon_expired`, `sold_out`, `favorite_error` devolvem erro de negócio.
- `payment_declined`, `payment_pending` e `order_timeout` alteram a compra.
- “Emitir mudança de preço” manda `nft.updated` pelo Socket.IO e atualiza o mesmo NFT na REST.
- “Resetar dados” volta ao seed conhecido.

Para reproduzir o timeout: entre com a Maya, adicione um NFT, escolha `order_timeout`, conecte a carteira e confirme. A primeira resposta estoura o tempo; a segunda, com a mesma chave, devolve o mesmo pedido.

## Deploy na Vercel

Preset Vite, output `dist`, install `pnpm install --frozen-lockfile`. O `vercel.json` reescreve rotas desconhecidas para `index.html` e não usa `cleanUrls`. Defina `VITE_ENABLE_MSW=true` em Production e Preview. Não crie uma pasta `api/` na raiz: a Vercel publicaria isso como função e o mock deixaria de ver `/api`.

Depois do deploy, confira refresh em `/nfts/nft-01`, o arquivo `/mockServiceWorker.js` respondendo JavaScript, login, compra e o botão de mudança de preço.
