import React, { useState } from 'react'
import { registrarTesteUsuario, RegistroTesteUsuario } from './user-test-log'

const camposPadrao: Omit<RegistroTesteUsuario, 'data'> = {
  testador: '',
  versao: '',
  cenario: '',
  passos: [],
  resultados: [],
  checklist: [],
  feedback: '',
}

export default function UserTestForm() {
  const [form, setForm] = useState({ ...camposPadrao })
  const [data, setData] = useState('')
  const [mensagem, setMensagem] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleArrayChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    campo: keyof typeof camposPadrao,
  ) {
    setForm({
      ...form,
      [campo]: e.target.value
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const registro: RegistroTesteUsuario = {
      ...form,
      data: data || new Date().toISOString().slice(0, 10),
    }
    registrarTesteUsuario(registro)
    setMensagem('Teste registrado com sucesso!')
    setForm({ ...camposPadrao })
    setData('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 500,
        margin: '0 auto',
        padding: 24,
        background: '#fafafa',
        borderRadius: 8,
      }}
    >
      <h2>Registro de Teste de Usuário</h2>
      <label>
        Data:
        <br />
        <input name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <br />
      <label>
        Testador:
        <br />
        <input name="testador" value={form.testador} onChange={handleChange} required />
      </label>
      <br />
      <label>
        Versão do sistema:
        <br />
        <input name="versao" value={form.versao} onChange={handleChange} required />
      </label>
      <br />
      <label>
        Cenário testado:
        <br />
        <input name="cenario" value={form.cenario} onChange={handleChange} required />
      </label>
      <br />
      <label>
        Passos realizados:
        <br />
        <textarea
          name="passos"
          value={form.passos.join('\n')}
          onChange={(e) => handleArrayChange(e, 'passos')}
          rows={3}
        />
      </label>
      <br />
      <label>
        Resultados observados:
        <br />
        <textarea
          name="resultados"
          value={form.resultados.join('\n')}
          onChange={(e) => handleArrayChange(e, 'resultados')}
          rows={2}
        />
      </label>
      <br />
      <label>
        Checklist de validação:
        <br />
        <textarea
          name="checklist"
          value={form.checklist.join('\n')}
          onChange={(e) => handleArrayChange(e, 'checklist')}
          rows={2}
        />
      </label>
      <br />
      <label>
        Feedback do usuário:
        <br />
        <textarea name="feedback" value={form.feedback} onChange={handleChange} rows={2} />
      </label>
      <br />
      <button type="submit">Registrar Teste</button>
      {mensagem && <div style={{ color: 'green', marginTop: 10 }}>{mensagem}</div>}
    </form>
  )
}
