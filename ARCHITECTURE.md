# Arquitetura

SPA Vite publicada na Vercel. Next.js e TanStack Start ficaram de fora: o enunciado pede mock no browser, refresh de rota e nenhum serviço privado.

## Estado

- A URL guarda busca, filtros, ordenação e página. Trocar filtro volta para a página 1.
- TanStack Query guarda catálogo, detalhe, favoritos, carrinho, cotação, pedido, perfil, carteiras e sessão.
- `localStorage` guarda só o token opaco e o id do visitante. Senha não é persistida. O cache do Query também não.
- `sessionStorage` guarda a chave de idempotência e o rascunho do checkout.
- ETH trafega como string decimal. A conta fecha com `decimal.js` no mock. O total pago é o da cotação.

Chaves privadas usam `meta.scope: "private"`. Logout remove essas queries, apaga o token, desconecta o socket e invalida o carrinho. O favorito otimista atualiza o cache e restaura se a mutation falha. Carrinho e checkout usam `scope` para não aplicar uma resposta antiga por cima da nova.

Queries de leitura tentam uma vez, exceto 400, 401, 403, 404, 409 e 422. Mutations não têm retry automático. O pedido tem uma exceção: se o Axios estourar o timeout de 2,5s, a mesma chave é enviada de novo. `staleTime` das leituras é 15s. `refetchOnWindowFocus` permanece ligado. Não há `persistQueryClient`.

## Contratos

Os schemas Zod em `src/contracts` são a fronteira. O Axios valida a resposta. Os handlers do MSW leem o mesmo schema. Erros têm `code`, `message` e, quando faz sentido, `fields`.

`POST /api/orders` exige `Idempotency-Key`. A mesma chave com o mesmo corpo devolve o pedido existente. A mesma chave com outro corpo responde 409. O recibo é o snapshot gravado na criação. Estoque e carrinho só mudam quando o status vira `confirmed`. `declined` e `confirmed` não mudam mais.

A cotação guarda a versão de cada NFT. Um evento mais novo marca `checkout-ack` como sujo, refaz a cotação e bloqueia a confirmação até o colecionador aceitar os novos valores.

## Mock e tempo real

O service worker sobe em `src/main.tsx` antes do import da aplicação. `socket.io-client` só entra depois disso, com `transports: ['websocket']`. O binding `@mswjs/socket.io-binding` 0.2.0 não tem salas, namespaces nem broadcast, e não abre um servidor de verdade (`server.connect()` não é chamado). O MSW 2.15 remove o prefixo `/socket.io/` antes de casar a URL, então o handler escuta o caminho do namespace, não a URL crua do Engine.IO. Cada conexão fica num registro em memória. Evento de pedido só sai para a conexão cujo `userId` coincide. O cliente ignora `id` repetido e `version` menor ou igual à que já aplicou.

O tempo de sessão e de cotação usa `db.clock`, não o relógio do Playwright. O relógio real só agenda a confirmação do pedido, e o `GET` do pedido rearma esse timer depois de um refresh. Os handlers rodam na página, mas a regra de negócio não depende disso.

Limitações do binding, registradas de propósito: sem polling HTTP do Engine.IO, sem rooms e sem o servidor Socket.IO na Vercel. Se o worker não subir antes do client, a conexão tenta a rede e falha, porque não existe backend.

## Interface

A fonte é Roboto Mono local. As imagens são SVG locais em `public/nfts`. Skeletons usam shimmer e param com `prefers-reduced-motion`. A home `/` segue o Figma do KURIO. O catálogo REST (busca, filtros, ordenação e paginação) fica em `/nfts`, sem entrar nesse layout e sem item no menu. Detalhe, carrinho, pagamento, entrada e perfil usam a mesma API. Criadores e Aprenda permanecem no cabeçalho, sem rota: o Figma não tem essas telas. Links editoriais fora da compra não navegam e não simulam sucesso.

## Auditoria

`scripts/lighthouse.mjs` mede o preview com mock, imagem e fonte ligados. Três execuções por página e perfil. A mediana fica em `reports/lighthouse/summary.json`. Cada execução também grava HTML e JSON ao lado, e esses arquivos não entram no repositório.

A primeira pintura espera o service worker: o app só monta depois de `worker.start()`, senão o Socket.IO capturaria o `WebSocket` nativo. A mediana abaixo foi medida em 23/10/2026 no preview `127.0.0.1:4173`, com Node 22.22.2, Lighthouse 13.5.0 e darwin arm64.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| início `/` | mobile | 90 | 100 | 100 | 100 | 3,33s | 0 | 12ms |
| detalhe `/nfts/nft-01` | mobile | 90 | 100 | 100 | 100 | 3,30s | 0,079 | 0 |
| detalhe `/nft/emerald-ape-042` | mobile | 90 | 100 | 100 | 100 | 3,38s | 0 | 0 |
| início `/` | desktop | 99 | 97 | 100 | 100 | 0,85s | 0 | 0 |
| detalhe `/nfts/nft-01` | desktop | 100 | 100 | 100 | 100 | 0,81s | 0,010 | 0 |
| detalhe `/nft/emerald-ape-042` | desktop | 99 | 100 | 100 | 100 | 0,84s | 0 | 0 |

As quatro categorias ficam dentro da meta. No mobile a performance fecha em 90, com LCP perto de 3,3s. No desktop o LCP fica abaixo de 1s e a performance em 99 ou 100. O CLS só aparece no detalhe `/nfts/nft-01`. Nada foi desligado para subir a nota. `public/robots.txt` existe para o arquivo não cair no rewrite da SPA, que devolveria HTML e reprovaria a auditoria de SEO.
