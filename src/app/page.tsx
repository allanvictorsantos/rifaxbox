"use client";

import { useState, useMemo, useEffect } from "react";
import { useRifa } from "@/hooks/useRifa";
import { ChevronRight, ChevronLeft, Check, ArrowRight, Clock, Ticket, X, Edit2 } from "lucide-react";
import { Toaster, toast } from "sonner";

interface NumeroRifa {
  numero: number;
  status: "disponivel" | "reservado" | "pago";
  cliente_whatsapp?: string;
}

export default function Home() {
  const { numeros, loading, reservarNumeros } = useRifa();
  
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [etapa, setEtapa] = useState(1);
  const [lote, setLote] = useState(0);
  const [vendoMeusPedidos, setVendoMeusPedidos] = useState(false);
  const [usuarioIdentificado, setUsuarioIdentificado] = useState(false);

  useEffect(() => {
    const salvoZap = localStorage.getItem("rifa_user_zap");
    const salvoNome = localStorage.getItem("rifa_user_nome");
    if (salvoZap) {
      setWhatsapp(salvoZap);
      setUsuarioIdentificado(true);
    }
    if (salvoNome) setNome(salvoNome);
    if (salvoZap) setEtapa(2);
  }, []);

  const meusPedidosGeral = useMemo(() => {
    if (!whatsapp) return [];
    return numeros.filter(n => n.cliente_whatsapp === whatsapp);
  }, [numeros, whatsapp]);

  const pendentes = meusPedidosGeral.filter(n => n.status === 'reservado');
  const confirmados = meusPedidosGeral.filter(n => n.status === 'pago');

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 8) v = `${v.slice(0, 10)}-${v.slice(10)}`;
    setWhatsapp(v);
  };

  const numerosLote = useMemo(() => {
    const inicio = lote * 100;
    return numeros.slice(inicio, inicio + 100);
  }, [numeros, lote]);

  const toggleNumero = (num: number, status: string) => {
    if (status !== "disponivel") return;
    setSelecionados((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const finalizarCompra = async () => {
    const nomeFinal = nome || "Cliente";
    const { success } = await reservarNumeros(selecionados, nomeFinal, whatsapp);
    if (success) {
      localStorage.setItem("rifa_user_zap", whatsapp);
      localStorage.setItem("rifa_user_nome", nomeFinal);
      setUsuarioIdentificado(true);
      
      const msg = `🎮 *RIFA XBOX - NOVO PEDIDO*\n\n*Nome:* ${nomeFinal}\n*Números:* ${selecionados.join(", ")}\n*Valor:* R$ ${(selecionados.length * 5).toFixed(2)}\n\n_Aguardo a chave PIX!_`;
      window.open(`https://wa.me/5511981102244?text=${encodeURIComponent(msg)}`, "_blank");
      setSelecionados([]);
      setVendoMeusPedidos(true);
    }
  };

  const resetarIdentidade = () => {
    localStorage.removeItem("rifa_user_zap");
    localStorage.removeItem("rifa_user_nome");
    setNome("");
    setWhatsapp("");
    setSelecionados([]);
    setVendoMeusPedidos(false);
    setUsuarioIdentificado(false);
    setEtapa(1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-2 font-sans antialiased">
      <Toaster position="top-center" richColors />

      <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative flex flex-col h-auto max-h-[98vh] transition-all duration-300">
        
        {/* HEADER */}
        <div className="pt-5 pb-3 px-6 border-b border-slate-50 flex items-center justify-between bg-white z-20 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Rifa Xbox One X</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Edição Especial 1TB</p>
          </div>
          
          {whatsapp.length >= 14 && (
            <button 
              onClick={() => setVendoMeusPedidos(!vendoMeusPedidos)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border
                ${vendoMeusPedidos 
                  ? "bg-slate-100 text-slate-600 border-slate-200" 
                  : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"}`}
            >
              {vendoMeusPedidos ? <X size={14} /> : <Ticket size={14} />}
              {vendoMeusPedidos ? "Fechar" : "Meus Bilhetes"}
            </button>
          )}
        </div>

        {/* TELA "MEUS PEDIDOS" */}
        {vendoMeusPedidos ? (
          <div className="flex-1 p-6 animate-in fade-in slide-in-from-bottom-4 bg-slate-50/50 overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-base font-bold text-slate-900">Olá, {nome.split(' ')[0] || 'Cliente'}!</h2>
              <p className="text-xs text-slate-500">Aqui estão seus bilhetes registrados</p>
            </div>

            <div className="space-y-4">
              {pendentes.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-amber-600">
                    <Clock size={16} className="animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Aguardando Validação</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {pendentes.map(n => (
                      <span key={n.numero} className="px-2 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded text-xs font-bold">#{n.numero}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 italic leading-tight">O admin está verificando. Assim que aprovar, eles ficarão verdes.</p>
                </div>
              )}

              {confirmados.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-emerald-600">
                    <Check size={16} strokeWidth={3} />
                    <span className="text-xs font-bold uppercase tracking-wider">Pagamento Confirmado</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {confirmados.map(n => (
                      <span key={n.numero} className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-xs font-bold">#{n.numero}</span>
                    ))}
                  </div>
                </div>
              )}

              {pendentes.length === 0 && confirmados.length === 0 && (
                <div className="text-center py-10 text-slate-400"><p className="text-sm">Você ainda não tem bilhetes.</p></div>
              )}
            </div>

            <div className="mt-8">
              <button onClick={() => { setVendoMeusPedidos(false); setEtapa(2); }} className="w-full h-12 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                <Ticket size={16} /> Comprar mais números
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full h-1 bg-slate-100 shrink-0">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(etapa / 3) * 100}%` }} />
            </div>

            {/* ETAPA 1 */}
            {etapa === 1 && (
              <div className="p-6 space-y-5 animate-in fade-in">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome Completo</label>
                    <input type="text" placeholder="Seu nome" disabled={usuarioIdentificado} className={`w-full h-11 px-4 rounded-lg border outline-none transition-all text-sm ${usuarioIdentificado ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50/50'}`} value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">WhatsApp</label>
                    <input type="tel" placeholder="(11) 99999-9999" disabled={usuarioIdentificado} className={`w-full h-11 px-4 rounded-lg border outline-none transition-all text-sm ${usuarioIdentificado ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50/50'}`} value={whatsapp} onChange={handleWhatsappChange} />
                  </div>
                </div>

                {usuarioIdentificado ? (
                  <div className="space-y-3">
                    <button onClick={() => setEtapa(2)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md">
                      Continuar como {nome.split(' ')[0]} <ArrowRight size={16} />
                    </button>
                    <button onClick={resetarIdentidade} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 underline flex items-center justify-center gap-1">
                      <Edit2 size={12} /> Corrigir meus dados
                    </button>
                  </div>
                ) : (
                  <button disabled={!nome || whatsapp.length < 15} onClick={() => { localStorage.setItem("rifa_user_zap", whatsapp); localStorage.setItem("rifa_user_nome", nome); setUsuarioIdentificado(true); setEtapa(2); }} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 mt-2 shadow-md disabled:opacity-50">
                    Continuar <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* ETAPA 2 */}
            {etapa === 2 && (
              <div className="flex flex-col h-full min-h-0 animate-in fade-in">
                <div className="pt-3 pb-2 px-6 text-center shrink-0">
                  <h2 className="text-base font-bold text-slate-900">Escolha seus números</h2>
                  <div className="flex justify-center gap-3 mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-white border border-slate-300 shadow-sm"></div>Livre</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-300 border border-amber-400"></div>Reservado</div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500 border border-red-600"></div>Pago</div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-50 shrink-0">
                    <button onClick={() => setLote((l) => Math.max(0, l - 1))} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-md transition-all"><ChevronLeft size={20} /></button>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lote {lote + 1}/10</span>
                    <button onClick={() => setLote((l) => Math.min(9, l + 1))} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-md transition-all"><ChevronRight size={20} /></button>
                </div>

                <div className="flex-1 p-2 overflow-y-auto bg-slate-50/30">
                  <div className="grid grid-cols-10 gap-1 w-full max-w-[380px] mx-auto">
                    {numerosLote.map((n: NumeroRifa) => (
                      <button key={n.numero} disabled={n.status !== "disponivel"} onClick={() => toggleNumero(n.numero, n.status)} className={`aspect-square flex items-center justify-center rounded-[4px] text-[10px] font-bold transition-all border shadow-sm ${n.status === "pago" ? "bg-red-500 text-white border-red-600 opacity-90 cursor-not-allowed" : ""} ${n.status === "reservado" ? "bg-amber-300 text-amber-900 border-amber-400 cursor-not-allowed" : ""} ${n.status === "disponivel" && !selecionados.includes(n.numero) ? "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600" : ""} ${selecionados.includes(n.numero) ? "bg-blue-600 text-white border-blue-600 scale-105 z-10 shadow-md" : ""}`}>{n.numero}</button>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
                  {selecionados.length > 0 ? (
                    <button onClick={() => setEtapa(3)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-between px-5 animate-in slide-in-from-bottom-2 shadow-lg shadow-blue-100 transition-all">
                      <span className="text-xs font-medium text-blue-100 uppercase tracking-wide">{selecionados.length} selecionado(s)</span>
                      <span className="text-base">Concluir R$ {(selecionados.length * 5).toFixed(2)}</span>
                    </button>
                  ) : (
                    <div className="w-full text-center text-slate-400 text-xs font-bold uppercase tracking-wide py-3 bg-slate-50 rounded-lg border border-slate-200 border-dashed">Selecione seus números</div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 3 */}
            {etapa === 3 && (
              <div className="flex flex-col animate-in fade-in duration-300 p-6">
                <div className="text-center mb-6">
                  <h1 className="text-lg font-bold text-slate-900">Confirme o pedido</h1>
                  <p className="text-xs text-slate-500 mt-1">Verifique seus números antes de enviar</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col items-center">
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4 max-h-[120px] overflow-y-auto w-full">
                    {selecionados.map((n) => <span key={n} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 shadow-sm">#{n}</span>)}
                  </div>
                  <div className="pt-4 border-t border-slate-200 w-full text-center">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total a Pagar</span>
                    <div className="text-3xl font-black text-blue-600 mt-1">R$ {(selecionados.length * 5).toFixed(2)}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={finalizarCompra} className="w-full h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md shadow-green-100 transition-all text-sm">Enviar no WhatsApp</button>
                  <button onClick={() => setEtapa(2)} className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Voltar e alterar</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}