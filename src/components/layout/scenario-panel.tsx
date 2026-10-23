import { useQueryClient } from '@tanstack/react-query'
import { scenarioSchema, type Scenario } from '@/contracts'
import { api } from '@/lib/api/client'
import { clearToken } from '@/lib/api/storage'
import { clearPrivateQueries } from '@/lib/query/client'

const scenarios = scenarioSchema.options

export function ScenarioPanel() {
  const queryClient = useQueryClient()

  async function selectScenario(scenario: Scenario) {
    await api.post('/__control/scenario', { scenario })
    await queryClient.invalidateQueries()
  }

  async function reset() {
    await api.post('/__control/reset')
    clearToken()
    clearPrivateQueries()
    await queryClient.invalidateQueries()
    window.location.assign('/')
  }

  async function emitPriceChange() {
    await api.post('/__control/emit', {
      event: {
        id: crypto.randomUUID(),
        type: 'nft.updated',
        resourceId: 'nft-01',
        version: 2,
        occurredAt: new Date().toISOString(),
        payload: {
          title: 'Dewdrop',
          priceByEdition: { 'nft-01-original': '0.99', 'nft-01-proof': '1.25' },
          availableByEdition: { 'nft-01-original': 8, 'nft-01-proof': 1 },
        },
      },
    })
  }

  return (
    <details className="mx-auto mt-8 w-full max-w-6xl px-4 text-sm text-muted">
      <summary className="cursor-pointer">Cenários de demonstração</summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-border px-2 py-1" onClick={() => void reset()}>
          Resetar dados
        </button>
        <button type="button" className="rounded-md border border-border px-2 py-1" onClick={() => void emitPriceChange()}>
          Emitir mudança de preço
        </button>
        {scenarios.map((scenario) => (
          <button
            key={scenario}
            type="button"
            className="rounded-md border border-border px-2 py-1"
            onClick={() => void selectScenario(scenario)}
          >
            {scenario}
          </button>
        ))}
      </div>
    </details>
  )
}
