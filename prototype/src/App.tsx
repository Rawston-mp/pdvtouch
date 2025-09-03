import { Routes, Route, NavLink } from 'react-router-dom'
import VendaRapida from './pages/VendaRapida'
import Finalizacao from './pages/Finalizacao'
import Relatorios from './pages/Relatorios'
import Impressao from './pages/Impressao'
import Admin from './pages/Admin'
import Sync from './pages/Sync'

export default function App() {
  return (
    <div style={{ display: 'grid', gridTemplateRows: '64px 1fr', height: '100vh' }}>
      <nav style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderBottom: '1px solid #ddd' }}>
        <strong>PDVTouch (Protótipo)</strong>
        <NavLink to="/" end>Venda</NavLink>
        <NavLink to="/finalizacao">Finalização</NavLink>
        <NavLink to="/impressao">Impressão</NavLink>
        <NavLink to="/relatorios">Relatórios</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/sync">Sync</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<VendaRapida />} />
        <Route path="/finalizacao" element={<Finalizacao />} />
        <Route path="/impressao" element={<Impressao />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/sync" element={<Sync />} />
      </Routes>
    </div>
  )
}
