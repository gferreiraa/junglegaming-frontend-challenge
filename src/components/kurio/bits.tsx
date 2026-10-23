import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import hideIcon from '../../../design/icons/Hide - cópia.svg?url'

export function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-3" aria-label={label}>
      <button
        type="button"
        className="btn btn-fill grid size-7 place-items-center rounded-full bg-primary text-body font-bold text-ink"
        aria-label={`Diminuir ${label}`}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <span className="min-w-4 text-center text-body font-bold">{value}</span>
      <button
        type="button"
        className="btn btn-fill grid size-7 place-items-center rounded-full bg-primary text-body font-bold text-ink"
        aria-label={`Aumentar ${label}`}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

export function EditionChips({
  editions,
  value,
  onChange,
}: {
  editions: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
      {editions.map((edition) => {
        const selected = edition === value
        return (
          <button
            key={edition}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(edition)}
            className={`h-7 rounded-full border px-2.5 text-[14px] leading-4 ${selected ? 'border-primary font-medium text-text-accent' : 'border-border text-text-secondary'}`}
          >
            {edition}
          </button>
        )
      })}
    </div>
  )
}

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-6" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`btn btn-quiet border-b-2 pb-3 text-body font-bold ${selected ? 'border-primary text-text-accent' : 'border-transparent text-text-secondary'}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function Breadcrumb({ items }: { items: { label: string; to?: '/' | '/carrinho' | '/pagamento' }[] }) {
  return (
    <nav aria-label="Trilha" className="text-[15px] leading-4 font-bold text-text-primary">
      <ol className="flex flex-wrap items-center">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center">
            {index > 0 ? <span aria-hidden="true" className="px-1.5 font-normal">/</span> : null}
            {item.to ? (
              <Link to={item.to} className="btn btn-quiet">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  return (
    <nav aria-label="Paginação" className="flex justify-end gap-2">
      {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
        <button
          key={item}
          type="button"
          aria-current={item === page ? 'page' : undefined}
          className={`btn btn-fill grid size-8 place-items-center rounded-sm text-caption ${item === page ? 'bg-primary text-ink' : 'bg-surface-card text-text-secondary'}`}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className="btn btn-fill grid size-8 place-items-center rounded-sm bg-surface-card text-text-secondary disabled:opacity-40"
        aria-label="Avançar página"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  )
}

export function CarouselDots({
  count,
  active,
  onSelect,
}: {
  count: number
  active: number
  onSelect?: (index: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-2" role={onSelect ? 'tablist' : undefined} aria-label={onSelect ? 'Slides do banner' : undefined} aria-hidden={onSelect ? undefined : true}>
      {Array.from({ length: count }, (_, index) => {
        const className = `rounded-full bg-primary ${index === active ? 'size-2' : 'size-1.5'}`
        if (!onSelect) return <span key={index} className={className} />
        return (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Slide ${index + 1}`}
            className="btn btn-dot grid size-6 place-items-center"
            onClick={() => onSelect(index)}
          >
            <span className={className} />
          </button>
        )
      })}
    </div>
  )
}

export function Field({
  label,
  required,
  children,
  hint,
  labelClassName,
}: {
  label: string
  required?: boolean
  children: ReactNode
  hint?: string
  labelClassName?: string
}) {
  return (
    <label className="grid gap-2">
      <span className={cn('text-body text-text-primary', labelClassName)}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 align-middle text-[22px] leading-none text-text-coral">
            *
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="text-caption text-text-muted">{hint}</span> : null}
    </label>
  )
}

export const controlClass =
  'h-11 w-full rounded-sm border border-border bg-transparent px-3 text-input text-text-primary outline-none placeholder:text-text-muted'

export function PasswordInput({
  id,
  name,
  placeholder,
  required,
  autoComplete,
  className,
}: {
  id?: string
  name?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={required ? 8 : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={cn(controlClass, 'pr-10', className)}
      />
      <button
        type="button"
        className="btn btn-icon absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        <img src={hideIcon} alt="" width={18} height={18} />
      </button>
    </span>
  )
}
