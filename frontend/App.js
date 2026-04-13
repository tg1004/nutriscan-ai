import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './src/context/ThemeContext'
import Navigation from './src/navigation'

const queryClient = new QueryClient()

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Navigation />
      </QueryClientProvider>
    </ThemeProvider>
  )
}