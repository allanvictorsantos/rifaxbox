"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Lock, LayoutDashboard, CheckCircle2, 
  XCircle, Smartphone, RefreshCcw, 
  Wallet, PiggyBank, Search, Filter, 
  Users, List, ChevronDown, ChevronUp, History, AlertTriangle
} from "lucide-react";
import { Toaster, toast } from "sonner";

// --- TIPOS ---
interface Numero {
  numero: number;
  status: string;
  cliente_nome: string;
  cliente_whatsapp: string;
  pedido_id: string; 
  created_at: string;
}

interface PedidoAgrupado {
  id: string; 
  cliente_nome: string;
  cliente_whatsapp: string;
  numeros: number[];
  status: string; 
  total: number;
  data: string; 
}

interface ClienteResumo {
  whatsapp: string;
  nome: string;
  totalGasto: number;
  totalNumeros: number;
  pedidos: PedidoAgrupado[];
  temPendencia: boolean;
}

export default function AdminPage() {
  const [acesso, setAcesso] = useState(false);
  const [senha, setSenha] = useState("");
  
  const [pedidos, setPedidos] = useState<PedidoAgrupado[]>([]);
  
  const [abaAtiva, setAbaAtiva] = useState<'pedidos' | 'clientes'>('pedidos');
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [stats, setStats] = useState({ pagos: 0, reservados: 0, totalArrecadado: 0 });

  // ESTADO PARA O MODAL DE CONFIRMAÇÃO
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState<PedidoAgrupado | null>(null);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "reservado" | "pago">("todos");

  const SENHA_ADMIN = "diegorifa@8570";

  // --- LÓGICA DE DADOS ---
  const clientes = useMemo(() => {
    const mapa: Record<string, ClienteResumo> = {};
    pedidos.forEach(pedido => {
      const zapKey = pedido.cliente_whatsapp?.replace(/\D/g, "") || "desconhecido";
      if (!mapa[zapKey]) {
        mapa[zapKey] = {
          whatsapp: pedido.cliente_whatsapp,
          nome: pedido.cliente_nome,
          totalGasto: 0,
          totalNumeros: 0,
          pedidos: [],
          temPendencia: false
        };
      }
      mapa[zapKey].totalGasto += pedido.total;
      mapa[zapKey].totalNumeros += pedido.numeros.length;
      mapa[zapKey].pedidos.push(pedido);
      if (pedido.status === 'reservado') mapa[zapKey].temPendencia = true;
    });
    return Object.values(mapa).sort((a, b) => b.totalGasto - a.totalGasto);
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      if (statusFiltro !== "todos" && pedido.status !== statusFiltro) return false;
      const termo = busca.toLowerCase();
      const matchNome = pedido.cliente_nome?.toLowerCase().includes(termo);
      const matchNumero = pedido.numeros.some(n => n.toString().includes(termo));
      return matchNome || matchNumero;
    });
  }, [pedidos, busca, statusFiltro]);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const termo = busca.toLowerCase();
      const matchNome = cliente.nome?.toLowerCase().includes(termo);
      const matchZap = cliente.whatsapp?.includes(termo);
      if (statusFiltro === "reservado" && !cliente.temPendencia) return false;
      if (statusFiltro === "pago" && cliente.temPendencia) return false;
      return matchNome || matchZap;
    });
  }, [clientes, busca, statusFiltro]);

  const fetchDados = useCallback(async () => {
    const { data, error } = await supabase.from("rifas").select("*").neq("status", "disponivel"); 
    if (error) return;

    const agrupados: Record<string, PedidoAgrupado> = {};
    let countPagos = 0; let countReservados = 0; let grana = 0;

    data?.forEach((item: Numero) => {
      if (item.status === 'pago') { countPagos++; grana += 5; } else { countReservados++; }
      const key = item.pedido_id || item.cliente_whatsapp || `antigo_${item.numero}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          id: key, cliente_nome: item.cliente_nome, cliente_whatsapp: item.cliente_whatsapp,
          numeros: [], status: item.status, total: 0, data: item.created_at
        };
      }
      agrupados[key].numeros.push(item.numero);
      agrupados[key].total += 5;
    });

    setStats({ pagos: countPagos, reservados: countReservados, totalArrecadado: grana });
    const listaOrdenada = Object.values(agrupados).sort((a, b) => {
      if (a.status === 'reservado' && b.status === 'pago') return -1;
      if (a.status === 'pago' && b.status === 'reservado') return 1;
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
    setPedidos(listaOrdenada);
  }, []);

  useEffect(() => {
    if (!acesso) return;
    fetchDados();
    const canal = supabase.channel('admin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'rifas' }, (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             if (payload.new && payload.new.status === 'reservado') toast("🔔 Novo pedido!", { description: `#${payload.new.numero} reservado.` });
             fetchDados(); 
          }
      }).subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [acesso, fetchDados]);

  const confirmarPagamento = async (pedido: PedidoAgrupado) => {
    setPedidos(current => current.map(p => p.id === pedido.id ? { ...p, status: 'pago' } : p));
    toast.success("Pagamento confirmado!");
    await supabase.from("rifas").update({ status: "pago" }).in("numero", pedido.numeros);
    
    const valorFormatado = pedido.total.toFixed(2);
    const numerosFormatados = pedido.numeros.join(", ");
    const nomeCliente = pedido.cliente_nome || "Cliente";
    const msg = ` *PAGAMENTO CONFIRMADO!*\n\nOlá ${nomeCliente}, conferi aqui e está tudo certo!\n\n *Seus Números:* ${numerosFormatados}\n *Valor:* R$ ${valorFormatado}\n\nBoa sorte! `;
    if (pedido.cliente_whatsapp) {
      window.open(`https://wa.me/55${pedido.cliente_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const confirmarCancelamento = async () => {
    if (!pedidoParaCancelar) return;
    
    // Otimista
    setPedidos(current => current.filter(p => p.id !== pedidoParaCancelar.id));
    setPedidoParaCancelar(null); // Fecha o modal

    await supabase.from("rifas").update({ status: "disponivel", cliente_nome: null, cliente_whatsapp: null, pedido_id: null }).in("numero", pedidoParaCancelar.numeros);
    fetchDados();
    toast.info("Pedido cancelado e números liberados.");
  };

  if (!acesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border w-full max-w-sm text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-500"><Lock size={20} /></div>
          <h1 className="font-bold text-xl text-slate-900">Acesso Restrito</h1>
          <input type="password" placeholder="Senha do Administrador" className="w-full h-12 px-4 border rounded-lg text-center outline-none focus:border-blue-500" onChange={e => setSenha(e.target.value)} />
          <button onClick={() => senha === SENHA_ADMIN ? setAcesso(true) : toast.error("Senha incorreta")} className="w-full h-12 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all">Entrar</button>
        </div>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans relative">
      <Toaster position="top-center" richColors />
      
      {/* --- MODAL DE CONFIRMAÇÃO (CUSTOMIZADO) --- */}
      {pedidoParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100 transform transition-all scale-100">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-full"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold text-slate-900">Cancelar Pedido?</h3>
            </div>
            <p className="text-slate-500 text-sm">
              Você está prestes a cancelar o pedido de <strong>{pedidoParaCancelar.cliente_nome}</strong>. 
              <br/>Os números <strong>{pedidoParaCancelar.numeros.join(", ")}</strong> ficarão disponíveis para compra novamente.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setPedidoParaCancelar(null)} className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Voltar</button>
              <button onClick={confirmarCancelamento} className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-colors">Sim, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-blue-600" /> Painel Admin</h1>
            <p className="text-slate-500 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Online</p>
          </div>
          <button onClick={fetchDados} className="p-2 bg-white border rounded-lg hover:bg-slate-50 text-slate-600"><RefreshCcw size={20} /></button>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Wallet size={24} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">Arrecadado</p><p className="text-2xl font-black text-slate-900">R$ {stats.totalArrecadado.toFixed(2)}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><CheckCircle2 size={24} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">Números Pagos</p><p className="text-2xl font-black text-slate-900">{stats.pagos}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-xl"><PiggyBank size={24} /></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase">Aguardando</p><p className="text-2xl font-black text-amber-500">{stats.reservados}</p></div>
          </div>
        </div>

        {/* ABAS */}
        <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
          <button onClick={() => setAbaAtiva('pedidos')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${abaAtiva === 'pedidos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List size={16} /> Pedidos ({pedidosFiltrados.length})</button>
          <button onClick={() => setAbaAtiva('clientes')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${abaAtiva === 'clientes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users size={16} /> Clientes ({clientes.length})</button>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por nome, zap ou número..." className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 outline-none focus:border-blue-500 text-sm" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white text-sm appearance-none cursor-pointer" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as any)}>
              <option value="todos">Todos</option>
              <option value="reservado">🟡 Pendentes</option>
              <option value="pago">🟢 Confirmados</option>
            </select>
          </div>
        </div>

        {/* LISTA PEDIDOS */}
        {abaAtiva === 'pedidos' && (
          <div className="space-y-4">
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${pedido.status === 'reservado' ? 'border-amber-300 shadow-amber-100' : 'border-slate-100 opacity-90'}`}>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${pedido.status === 'reservado' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <h3 className="font-bold text-slate-900 text-lg">{pedido.cliente_nome || 'Sem Nome'}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pedido.status === 'reservado' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{pedido.status === 'reservado' ? 'AGUARDANDO' : 'PAGO'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1"><Smartphone size={14}/> {pedido.cliente_whatsapp}</div>
                      <div className="flex items-center gap-1 font-medium text-slate-700">{pedido.numeros.length} números • R$ {pedido.total.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-xs">{pedido.numeros.map(n => <span key={n} className={`px-2 py-1 border rounded text-xs font-bold ${pedido.status === 'pago' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>#{n}</span>)}</div>
                  <div className="flex items-center gap-2">
                    {pedido.status === 'reservado' && (
                      <>
                        {/* AQUI CHAMA O MODAL NOVO */}
                        <button onClick={() => setPedidoParaCancelar(pedido)} className="px-4 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100">Cancelar</button>
                        <button onClick={() => confirmarPagamento(pedido)} className="px-6 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center gap-2">Confirmar</button>
                      </>
                    )}
                    {pedido.status === 'pago' && <button disabled className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg opacity-50 cursor-not-allowed">Concluído</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTA CLIENTES */}
        {abaAtiva === 'clientes' && (
          <div className="space-y-4">
            {clientesFiltrados.map((cliente) => (
              <div key={cliente.whatsapp} className={`bg-white rounded-2xl border transition-all ${cliente.temPendencia ? 'border-amber-200 shadow-amber-50' : 'border-slate-100 shadow-sm'}`}>
                <div className="p-5 flex flex-col md:flex-row justify-between items-center cursor-pointer hover:bg-slate-50/50" onClick={() => setClienteExpandido(clienteExpandido === cliente.whatsapp ? null : cliente.whatsapp)}>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${cliente.temPendencia ? 'bg-amber-400' : 'bg-blue-600'}`}>{cliente.nome?.charAt(0).toUpperCase() || '?'}</div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">{cliente.nome || 'Cliente'} {cliente.temPendencia && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Pendência</span>}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex items-center gap-1"><Smartphone size={14}/> {cliente.whatsapp}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right"><p className="text-xs font-bold text-slate-400 uppercase">Total</p><p className="text-xl font-black text-slate-900">R$ {cliente.totalGasto.toFixed(2)}</p></div>
                    {clienteExpandido === cliente.whatsapp ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                  </div>
                </div>
                {clienteExpandido === cliente.whatsapp && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><History size={14}/> Histórico</h4>
                    <div className="space-y-2">
                      {cliente.pedidos.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${p.status === 'pago' ? 'bg-emerald-500' : 'bg-amber-500'}`}/><span className="font-bold text-slate-700">{p.numeros.length} números:</span><span className="text-slate-500">{p.numeros.join(", ")}</span></div>
                          <div className="flex items-center gap-3"><span className="font-bold">R$ {p.total.toFixed(2)}</span>{p.status === 'reservado' && (<button onClick={(e) => { e.stopPropagation(); confirmarPagamento(p); }} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200">Confirmar</button>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}