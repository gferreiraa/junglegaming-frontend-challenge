import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/explorer/$txRef')({
  head: () => ({ meta: [{ title: 'Explorador simulado — Jungle Market' }] }),
  component: function ExplorerRoute() {
    const { txRef } = Route.useParams()
    return (
      <article className="grid max-w-xl gap-3">
        <h1 className="text-3xl font-semibold">Explorador simulado</h1>
        <p>Esta referência não consulta uma blockchain. Ela reproduz o identificador do recibo.</p>
        <p className="break-all">{txRef}</p>
      </article>
    )
  },
})
