// src/App.tsx
import { NavLink, Routes, Route } from 'react-router-dom'
import VendaRapida from './pages/VendaRapida'
import Finalizacao from './pages/Finalizacao'
import Impressao from './pages/Impressao'
import Relatorios from './pages/Relatorios'
import RelatorioXZ from './pages/RelatorioXZ'
import Admin from './pages/Admin'
import Configuracoes from './pages/Configuracoes'
import Sync from './pages/Sync'
import Turno from './pages/Turno' // <--- NOVO

export default function App() {
  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 12, borderBottom: '1px solid #eee' }}>
        <b>PDVTouch (Protótipo)</b>
        <NavLink to="/config" >Configurações</NavLink>
        <NavLink to="/venda">Venda</NavLink>
        <NavLink to="/finalizacao">Finalização</NavLink>
        <NavLink to="/impressao">Impressão</NavLink>
        <NavLink to="/relatorios">Relatórios</NavLink>
        <NavLink to="/relatorio-xz">Relatório X/Z</NavLink>
        <NavLink to="/turno">Turno</NavLink> {/* <--- NOVO */}
        <NavLink to="/admin">Admin</NavLink>
        <NavLink to="/sync">Sync</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<VendaRapida/>} />
        <Route path="/venda" element={<VendaRapida/>} />
        <Route path="/finalizacao" element={<Finalizacao/>} />
        <Route path="/impressao" element={<Impressao/>} />
        <Route path="/relatorios" element={<Relatorios/>} />
        <Route path="/relatorio-xz" element={<RelatorioXZ/>} />
        <Route path="/turno" element={<Turno/>} /> {/* <--- NOVO */}
        <Route path="/admin" element={<Admin/>} />
        <Route path="/config" element={<Configuracoes/>} />
        <Route path="/sync" element={<Sync/>} />
      </Routes>
    </div>
  )
}
