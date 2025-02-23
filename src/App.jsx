import { DatabaseProvider } from './context/DatabaseContext'
import ImageCollector from './components/ImageCollector'

function App() {
  return (
    <DatabaseProvider>
      <main className="w-full">
        <ImageCollector />
      </main>
    </DatabaseProvider>
  )
}

export default App