import { enableMocking } from '@/mocks/enable'
import './index.css'

void enableMocking().then(async () => {
  const { mount } = await import('@/mount')
  mount()
})
