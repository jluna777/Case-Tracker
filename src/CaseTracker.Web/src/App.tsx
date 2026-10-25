import { Route, Routes } from 'react-router'
import Header from './components/Header.tsx'
import CasesPage from './pages/CasesPage.tsx'
import CaseDetailPage from './pages/CaseDetailPage.tsx'
import NewCasePage from './pages/NewCasePage.tsx'

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<CasesPage />} />
        <Route path="/cases/new" element={<NewCasePage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
      </Routes>
    </>
  )
}
