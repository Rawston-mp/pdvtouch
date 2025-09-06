// src/App.tsx
import { NavLink, Routes, Route } from "react-router-dom"
import { Suspense, lazy } from "react"

// Páginas (todas já enviadas anteriormente)
import VendaRapida from "./pages/VendaRapida"
import Finalizacao from "./pages/Finalizacao"
import Impressao from "./pages/Impressao"
import Relatorios from "./pages/Relatorios"
import Admin from "./pages/Admin"
import Sync from "./pages/Sync"
// Novo: Relatório X/Z
import RelatorioXZ from "./pages/RelatorioXZ"

export default function App() {
  return (
    <div>
      <Header />

      <main style={{ padding: 12 }}>
        <Suspense fallback={<div>Carregando…</div>}>
          <Routes>
            <Route path="/" element={<VendaRapida />} />
            <Route path="/venda" element={<VendaRapida />} />
            <Route path="/finalizacao" element={<Finalizacao />} />
            <Route path="/impressao" element={<Impressao />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/relatorio-xz" element={<RelatorioXZ />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/sync" element={<Sync />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

function Header() {
  const link = (to: string, label: string) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: "none",
        padding: "6px 10px",
        borderRadius: 6,
        color: isActive ? "#4a61d8" : "#222",
        fontWeight: 600
      })}
    >
      {label}
    </NavLink>
  )

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 12px",
        borderBottom: "1px solid #eee"
      }}
    >
      <div style={{ fontWeight: 800 }}>PDVTouch (Protótipo)</div>
      {link("/venda", "Venda")}
      {link("/finalizacao", "Finalização")}
      {link("/impressao", "Impressão")}
      {link("/relatorios", "Relatórios")}
      {link("/relatorio-xz", "Relatório X/Z")} {/* <- nova aba */}
      {link("/admin", "Admin")}
      {link("/sync", "Sync")}
    </header>
  )
}
