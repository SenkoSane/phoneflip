import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SyncProvider } from './components/SyncProvider'
import { useI18n } from './i18n'
import { syncOpenAiKeyFromWorkshop } from './lib/ai'
import { syncCustomGateHash } from './lib/gate'
import { useStore } from './store'
import { Books } from './pages/Books'
import { Dashboard } from './pages/Dashboard'
import { Equipment } from './pages/Equipment'
import { JobDetail } from './pages/JobDetail'
import { JobForm } from './pages/JobForm'
import { Jobs } from './pages/Jobs'
import { Imei } from './pages/Imei'
import { Messages } from './pages/Messages'
import { Leveranciers } from './pages/Leveranciers'
import { Marktwaarde } from './pages/Marktwaarde'
import { Parts } from './pages/Parts'
import { PhoneDetail } from './pages/PhoneDetail'
import { PhoneForm } from './pages/PhoneForm'
import { QuoteForm } from './pages/QuoteForm'
import { Quotes } from './pages/Quotes'
import { ReceiptForm } from './pages/ReceiptForm'
import { Receipts } from './pages/Receipts'
import { Settings } from './pages/Settings'
import { SellStudio } from './pages/SellStudio'
import { Tickets } from './pages/Tickets'
import { StoreProvider } from './store'

function LangSync() {
  const { data } = useStore()
  const { lang, setLang } = useI18n()
  const remote = data.workshop?.locale
  useEffect(() => {
    if ((remote === 'en' || remote === 'nl') && remote !== lang) setLang(remote)
  }, [remote, lang, setLang])
  useEffect(() => {
    syncCustomGateHash(data.workshop?.passwordHash)
  }, [data.workshop?.passwordHash])
  useEffect(() => {
    syncOpenAiKeyFromWorkshop(data.workshop?.openaiKey)
  }, [data.workshop?.openaiKey])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <LangSync />
      <SyncProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/boekhouding" element={<Books />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/toestel/nieuw" element={<PhoneForm />} />
              <Route path="/toestel/:id" element={<PhoneDetail />} />
              <Route path="/toestel/:id/bewerken" element={<PhoneForm />} />
              <Route path="/toestel/:id/verkopen" element={<SellStudio />} />
              <Route path="/reparaties" element={<Jobs />} />
              <Route path="/reparatie/nieuw" element={<JobForm />} />
              <Route path="/reparatie/:id" element={<JobDetail />} />
              <Route path="/reparatie/:id/bewerken" element={<JobForm />} />
              <Route path="/offertes" element={<Quotes />} />
              <Route path="/offertes/nieuw" element={<QuoteForm />} />
              <Route path="/offertes/:id" element={<QuoteForm />} />
              <Route path="/bonnen" element={<Receipts />} />
              <Route path="/bonnen/nieuw" element={<ReceiptForm />} />
              <Route path="/bonnen/:id" element={<ReceiptForm />} />
              <Route path="/imei" element={<Imei />} />
              <Route path="/berichten" element={<Messages />} />
              <Route path="/marktwaarde" element={<Marktwaarde />} />
              <Route path="/leveranciers" element={<Leveranciers />} />
              <Route path="/onderdelen" element={<Parts />} />
              <Route path="/apparatuur" element={<Equipment />} />
              <Route path="/instellingen" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </SyncProvider>
    </StoreProvider>
  )
}
