<<<<<<< HEAD
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from "../auth/session";
import logo from "../assets/logoPdvtouch.jpeg";

export default function NavBar() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand" onClick={() => navigate("/")}>
          <img
            src={logo}
            alt="Logotipo"
            style={{
              height: 40,
              marginRight: 14,
              borderRadius: 8,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,.10)",
            }}
          />
          PDVTouch <span className="muted">(Protótipo)</span>
        </div>

        <button
          className="hamburger"
          aria-label="Abrir menu"
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>

        <nav className={`links ${open ? "open" : ""}`}>
          <NavLink to="/" onClick={() => setOpen(false)}>
            Venda
          </NavLink>
          <NavLink to="/finalizacao" onClick={() => setOpen(false)}>
            Finalização
          </NavLink>
          <NavLink to="/impressao" onClick={() => setOpen(false)}>
            Impressão
          </NavLink>
          <NavLink to="/relatorios" onClick={() => setOpen(false)}>
            Relatórios
          </NavLink>
          <NavLink to="/relatorioxz" onClick={() => setOpen(false)}>
            Relatório X/Z
          </NavLink>
          <NavLink to="/turno" onClick={() => setOpen(false)}>
            Turno
          </NavLink>
          <NavLink to="/sync" onClick={() => setOpen(false)}>
            Sync
          </NavLink>
          <NavLink to="/admin" onClick={() => setOpen(false)}>
            Admin
          </NavLink>
=======
import { NavLink, useNavigate } from 'react-router-dom'
import { useSession } from '../auth/session'
import React, { useState } from 'react'

export default function NavBar() {
  const { user, signOut } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const menuItems = [
    { label: 'Venda', href: '/', active: false },
    { label: 'Finalização', href: '/finalizacao', active: false },
    { label: 'Impressão', href: '/impressao', active: false },
    { label: 'Relatórios', href: '/relatorios', active: false },
    { label: 'Relatório X/Z', href: '/relatorioxz', active: false },
    { label: 'Turno', href: '/turno', active: false },
    { label: 'Sync', href: '/sync', active: false },
    { label: 'Terminais Balança', href: '/terminaisbalanca', active: false },
    { label: 'Admin', href: '/admin', active: false },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        PDVTouch <span style={{ color: '#ffb347' }}>(Protótipo)</span>
      </div>
      <div className="navbar-menu-wrapper">
        <div className="navbar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <button className="hamburger" aria-label="Abrir menu" onClick={() => setOpen((o) => !o)}>
          ☰
        </button>

        <nav className={`links ${open ? 'open' : ''}`}>
          {menuItems.map((item) => (
            <NavLink key={item.label} to={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
>>>>>>> dectype
        </nav>

        <div className="session">
          {user ? (
            <>
              <span className="badge">
                {user.name} — {user.role}
              </span>
              <button
                className="btn"
                onClick={() => {
<<<<<<< HEAD
                  signOut();
                  navigate("/");
=======
                  signOut()
                  navigate('/')
>>>>>>> dectype
                }}
              >
                Sair
              </button>
            </>
          ) : (
            <span className="badge muted">Não autenticado</span>
          )}
        </div>
      </div>
<<<<<<< HEAD
    </header>
  );
=======
    </nav>
  )
>>>>>>> dectype
}
