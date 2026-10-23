import { Link } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useState } from 'react'
import facebookIcon from '../../../design/icons/Facebook.svg?url'
import instagramIcon from '../../../design/icons/Instagram.svg?url'
import twitterIcon from '../../../design/icons/Twitter.svg?url'
import linkedinIcon from '../../../design/icons/Linkedin.svg?url'

const columns = [
  {
    title: 'Meu perfil',
    links: ['Meu perfil', 'Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'],
  },
  {
    title: 'Central de ajuda',
    links: ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'],
  },
  {
    title: 'Coleções',
    links: ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'],
  },
]

export function SiteFooter() {
  const [note, setNote] = useState('')

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')
    setNote(email.includes('@') ? 'Aviso guardado neste navegador.' : 'Informe um e-mail válido.')
  }

  return (
    <footer className="mt-24 hidden lg:block">
      <div className="container-kurio grid overflow-hidden rounded-lg bg-surface-card lg:grid-cols-4">
        {[
          ['W', 'Segurança da carteira', 'Proteja sua carteira e colecione arte digital verificada com confiança.'],
          ['C', 'Criadores em destaque', 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.'],
          ['D', 'Alertas de lançamentos', 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.'],
        ].map(([mark, title, text]) => (
          <section key={title} className="border-b border-border p-6 lg:border-r lg:border-b-0">
            <span className="grid size-12 place-items-center rounded-full bg-primary text-body-lg font-bold text-ink">{mark}</span>
            <h2 className="mt-4 text-body-lg font-bold">{title}</h2>
            <p className="mt-2 text-body text-text-secondary">{text}</p>
          </section>
        ))}
        <section className="p-6">
          <h2 className="text-body-lg font-bold">Antecipe-se ao próximo lançamento</h2>
          <form className="mt-4 flex gap-2" onSubmit={subscribe}>
            <label className="sr-only" htmlFor="newsletter">
              E-mail para lançamentos
            </label>
            <input id="newsletter" name="email" type="email" placeholder="digite seu e-mail..." className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-ink px-3 text-caption" />
            <button type="submit" className="btn btn-fill h-10 rounded-sm bg-primary px-4 text-caption font-bold text-ink">
              Enviar
            </button>
          </form>
          <p className="mt-3 text-caption text-text-secondary">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          <p className="mt-2 text-caption text-text-muted" role="status">
            {note}
          </p>
        </section>
      </div>
      <div className="mt-6 bg-surface-dark">
        <div className="container-kurio flex flex-wrap items-center justify-between gap-4 py-6 text-caption text-text-secondary">
          <span className="font-bold tracking-[0.18em] text-text-primary">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <a href="mailto:contato@email.com">contato@email.com</a>
          <span>+55 11 4002 8922</span>
        </div>
      </div>
      <div className="bg-surface-card">
        <div className="container-kurio grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-body font-bold">{column.title}</h2>
              <ul className="mt-3 grid gap-2 text-caption text-text-secondary">
                {column.links.map((link) => (
                  <li key={link}>
                    {link === 'Meu perfil' ? (
                      <Link to="/perfil" className="btn btn-quiet">{link}</Link>
                    ) : (
                      <button type="button" className="btn btn-quiet" onClick={() => setNote(`${link} não faz parte desta entrega.`)}>
                        {link}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="text-body font-bold">Redes sociais</h2>
            <ul className="mt-3 flex gap-2">
              {[
                [facebookIcon, 'Facebook'],
                [instagramIcon, 'Instagram'],
                [twitterIcon, 'Twitter'],
                [linkedinIcon, 'LinkedIn'],
              ].map(([src, label]) => (
                <li key={label}>
                  <a href={`https://www.${label.toLowerCase()}.com`} aria-label={label} className="btn btn-social grid size-8 place-items-center rounded-sm border border-primary">
                    <img src={src} alt="" width={14} height={14} />
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-body font-bold">Carteiras compatíveis</h2>
            <p className="mt-3 flex flex-wrap gap-2 text-micro font-bold text-text-accent">
              <span className="rounded-sm border border-border px-2 py-1">METAMASK</span>
              <span className="rounded-sm border border-border px-2 py-1">WALLETCONNECT</span>
              <span className="rounded-sm border border-border px-2 py-1">COINBASE</span>
            </p>
          </div>
        </div>
        <p className="pb-8 text-center text-caption text-text-muted">© 2026 Kurio. Propriedade digital para todos.</p>
      </div>
    </footer>
  )
}
