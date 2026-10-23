import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { addressSchema, networkSchema, passwordSchema, NETWORKS } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sessionQueryOptions } from '@/features/auth/session'
import { ApiError } from '@/lib/api/errors'
import { changePassword, createWallet, fetchProfile, fetchWallets, updateProfile, updateWallet } from '@/lib/api/marketplace'

const profileFormSchema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.email('Informe um e-mail válido'),
  bio: z.string().max(180, 'Use até 180 caracteres'),
})

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  nextPassword: passwordSchema,
})

const walletFormSchema = z.object({
  label: z.string().min(2, 'Informe um nome'),
  address: addressSchema,
  network: networkSchema,
  isPrimary: z.boolean(),
})

export function ProfilePage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, meta: { scope: 'private' } })
  if (!profile.data) return <p>Carregando perfil</p>
  return <ProfileForm profile={profile.data} />
}

function ProfileForm({ profile }: { profile: { name: string; email: string; bio: string; avatarUrl: string | null } }) {
  const queryClient = useQueryClient()
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined)
  const avatarUrl = avatarOverride === undefined ? profile.avatarUrl : avatarOverride
  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: profile.name, email: profile.email, bio: profile.bio },
  })
  const passwordForm = useForm({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', nextPassword: '' },
  })

  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (next) => {
      queryClient.setQueryData(['profile'], next)
      await queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey })
      toast.success('Perfil atualizado')
    },
  })
  const password = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Senha alterada')
    },
  })

  return (
    <div className="grid max-w-xl gap-8">
      <h1 className="text-3xl font-semibold">Perfil</h1>
      <form
        className="grid gap-3"
        onSubmit={form.handleSubmit((values) => save.mutate({ ...values, avatarUrl }))}
        noValidate
      >
        {avatarUrl ? <img src={avatarUrl} alt="Avatar atual" width={96} height={96} className="size-24 rounded-full object-cover" /> : null}
        <div className="grid gap-1">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void resizeAvatar(file).then((next) => setAvatarOverride(next))
            }}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="profile-name">Nome</Label>
          <Input id="profile-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
          {form.formState.errors.name ? <p role="alert">{form.formState.errors.name.message}</p> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input id="profile-email" type="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
          {form.formState.errors.email ? <p role="alert">{form.formState.errors.email.message}</p> : null}
          {save.error instanceof ApiError && save.error.fields?.email ? <p role="alert">{save.error.fields.email}</p> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bio">Bio</Label>
          <Input id="bio" {...form.register('bio')} />
        </div>
        <Button type="submit" disabled={save.isPending}>
          Salvar perfil
        </Button>
      </form>
      <form className="grid gap-3" onSubmit={passwordForm.handleSubmit((values) => password.mutate(values))} noValidate>
        <h2 className="text-xl font-semibold">Senha</h2>
        <div className="grid gap-1">
          <Label htmlFor="current-password">Senha atual</Label>
          <Input id="current-password" type="password" {...passwordForm.register('currentPassword')} />
          {password.error instanceof ApiError && password.error.fields?.currentPassword ? (
            <p role="alert">{password.error.fields.currentPassword}</p>
          ) : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="next-password">Nova senha</Label>
          <Input id="next-password" type="password" aria-invalid={Boolean(passwordForm.formState.errors.nextPassword)} {...passwordForm.register('nextPassword')} />
          {passwordForm.formState.errors.nextPassword ? <p role="alert">{passwordForm.formState.errors.nextPassword.message}</p> : null}
        </div>
        <Button type="submit" variant="outline" disabled={password.isPending}>
          Alterar senha
        </Button>
      </form>
    </div>
  )
}

export function WalletsPage() {
  const queryClient = useQueryClient()
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: fetchWallets, meta: { scope: 'private' } })
  const [editing, setEditing] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(walletFormSchema),
    defaultValues: { label: '', address: '', network: 'ethereum' as const, isPrimary: false },
  })
  const save = useMutation({
    mutationFn: (values: z.infer<typeof walletFormSchema>) =>
      editing ? updateWallet(editing, values) : createWallet(values),
    onSuccess: async () => {
      setEditing(null)
      form.reset({ label: '', address: '', network: 'ethereum', isPrimary: false })
      await queryClient.invalidateQueries({ queryKey: ['wallets'] })
      toast.success('Carteira salva')
    },
  })

  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-3xl font-semibold">Carteiras</h1>
      <ul className="grid gap-3">
        {wallets.data?.map((wallet) => (
          <li key={wallet.id} className="rounded-md border border-border p-3">
            <p className="font-semibold">
              {wallet.label} {wallet.isPrimary ? '· principal' : '· secundária'}
            </p>
            <p className="break-all text-sm text-muted">{wallet.address}</p>
            <p className="text-sm">{NETWORKS[wallet.network].label}</p>
            <Button
              className="mt-2"
              variant="outline"
              type="button"
              onClick={() => {
                setEditing(wallet.id)
                form.reset(wallet)
              }}
            >
              Editar
            </Button>
          </li>
        ))}
      </ul>
      <form className="grid gap-3" onSubmit={form.handleSubmit((values) => save.mutate(values))} noValidate>
        <h2 className="text-xl font-semibold">{editing ? 'Editar carteira' : 'Nova carteira'}</h2>
        <div className="grid gap-1">
          <Label htmlFor="wallet-label">Nome</Label>
          <Input id="wallet-label" {...form.register('label')} />
          {form.formState.errors.label ? <p role="alert">{form.formState.errors.label.message}</p> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="wallet-address">Endereço</Label>
          <Input id="wallet-address" aria-invalid={Boolean(form.formState.errors.address)} {...form.register('address')} />
          {form.formState.errors.address ? <p role="alert">{form.formState.errors.address.message}</p> : null}
          {save.error instanceof ApiError && save.error.fields?.address ? <p role="alert">{save.error.fields.address}</p> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="wallet-network">Rede</Label>
          <select id="wallet-network" className="h-10 rounded-md border border-border bg-background px-3" {...form.register('network')}>
            {Object.entries(NETWORKS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('isPrimary')} />
          Carteira principal
        </label>
        <Button type="submit" disabled={save.isPending}>
          Salvar carteira
        </Button>
      </form>
    </div>
  )
}

async function resizeAvatar(file: File) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0, 128, 128)
  return canvas.toDataURL('image/jpeg', 0.7)
}
