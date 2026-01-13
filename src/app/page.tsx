"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRifa } from "@/hooks/useRifa";
import { ChevronLeft, ChevronRight, Check, Clock, Ticket, X, Copy, Info, Send, AlertTriangle, ChevronDown, ChevronUp, AlertCircle, MessageCircle, Globe, Smartphone, ArrowRight, Camera } from "lucide-react";
import { Toaster, toast } from "sonner";
import { toPng } from 'html-to-image';

interface NumeroRifa {
  numero: number;
  status: "disponivel" | "reservado" | "pago";
  cliente_whatsapp?: string;
}

export default function Home() {
  const { numeros, loading, reservarNumeros } = useRifa();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [modo, setModo] = useState<"inicio" | "digital" | "tradicional">("inicio");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [etapa, setEtapa] = useState(1);
  const [lote, setLote] = useState(0);
  const [vendoMeusPedidos, setVendoMeusPedidos] = useState(false);
  const [usuarioIdentificado, setUsuarioIdentificado] = useState(false);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [imagemAtual, setImagemAtual] = useState(0);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // --- CONFIGURAÇÕES ---
  const CHAVE_PIX = "11981102244"; 
  const CHAVE_PIX_FORMATADA = "(11) 98110-2244";
  const WHATSAPP_SUPORTE = "5511964525170"; 

  const DATA_SORTEIO = "28/03/2026"; 
  const NUMERO_GANHADOR: number | null = null; 

  const premios = [
    { url: "/console.jpeg", title: "Xbox One X 1TB", desc: "Inclui Fonte + Cabo HDMI", badge: "Prêmio Principal" },
    { url: "/controles.jpeg", title: "2 Controles Originais", desc: "Inclui Carregador Duracell", badge: "Acessório" },
    { url: "/jogos.png", title: "3 Jogos Físicos", desc: "Discos bem conservados", badge: "Bônus" }
  ];

  const formatarNumero = (n: number) => n.toString().padStart(3, '0');

  useEffect(() => {
    const salvoZap = localStorage.getItem("rifa_user_zap");
    const salvoNome = localStorage.getItem("rifa_user_nome");
    if (salvoZap) { setWhatsapp(salvoZap); setUsuarioIdentificado(true); }
    if (salvoNome) setNome(salvoNome);
  }, []);

  const meusPedidosGeral = useMemo(() => {
    if (!whatsapp) return [];
    return numeros.filter(n => n.cliente_whatsapp === whatsapp);
  }, [numeros, whatsapp]);

  const pendentes = meusPedidosGeral.filter(n => n.status === 'reservado');
  const confirmados = meusPedidosGeral.filter(n => n.status === 'pago');

  const numerosLote = useMemo(() => {
    const inicio = lote * 100;
    return numeros.slice(inicio, inicio + 100);
  }, [numeros, lote]);

  const textoPaginacao = useMemo(() => {
    const inicio = lote * 100;
    const fim = inicio + 99;
    return `${formatarNumero(inicio)} a ${formatarNumero(fim)}`;
  }, [lote]);

  const toggleNumero = (num: number, status: string) => {
    if (status !== "disponivel") return;
    setSelecionados((prev) => prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = v.replace(/^(\d{2})/, "($1) ");
    if (v.length > 7) v = v.replace(/(\d{5})(\d)/, "$1-$2");
    setWhatsapp(v);
  };

  const copiarPix = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    toast.success("Copiado!");
  };

  const finalizarCompra = async () => {
    const nomeFinal = nome || "Cliente";
    const { success } = await reservarNumeros(selecionados, nomeFinal, whatsapp);
    if (success) {
      localStorage.setItem("rifa_user_zap", whatsapp);
      localStorage.setItem("rifa_user_nome", nomeFinal);
      setUsuarioIdentificado(true);
      setSelecionados([]);
      setVendoMeusPedidos(true); 
      toast.success("Reservado!");
    }
  };

  const voltarParaCadastro = () => {
    setUsuarioIdentificado(false);
    setEtapa(1);
  };

  const enviarComprovante = () => {
    if (pendentes.length === 0) return;
    const listaNumeros = pendentes.map(p => formatarNumero(p.numero)).join(", ");
    const total = (pendentes.length * 5).toFixed(2);
    const primeiroNome = nome.split(' ')[0];
    const msg = `*COMPROVANTE DE RIFA*\n\n*Nome:* ${primeiroNome}\n*Numeros:* ${listaNumeros}\n*Total:* R$ ${total}\n\nSegue o comprovante do PIX abaixo:`;
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const falarComDonoDireto = () => {
    const msg = `Olá Allan! Vi a tabela da Rifa do Xbox e quero escolher meus números.`;
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const tirarPrintTabela = useCallback(async () => {
    if (printRef.current) {
      try {
        const dataUrl = await toPng(printRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `rifa-tabela-${lote + 1}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Tabela salva com sucesso!");
      } catch (err) {
        console.error("Erro no print:", err);
        toast.error("Não foi possível salvar a imagem.");
      }
    }
  }, [printRef, lote]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-2 font-sans antialiased overflow-y-auto">
      <Toaster position="top-center" richColors />

      {modo === "inicio" && (
        <div className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 my-auto">
          <div className="bg-white p-6 rounded-2xl shadow-xl text-center border border-slate-200">
            <h1 className="text-2xl font-black text-slate-900 mb-2">Rifa Xbox One X</h1>
            <p className="text-sm text-slate-500 mb-8 font-medium">Como você prefere participar?</p>
            <button onClick={() => setModo("tradicional")} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl p-5 mb-4 flex items-center gap-4 shadow-lg shadow-green-200 transition-all transform hover:scale-[1.02] text-left group border border-green-400 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 -mr-4 -mt-4"><MessageCircle size={100} /></div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0"><Smartphone size={28} /></div>
              <div className="relative z-10">
                <span className="block font-black text-base uppercase tracking-wide">Pedir no WhatsApp</span>
                <span className="text-xs text-green-100 font-medium">Ver a tabela e falar direto com o Allan. (Modo Fácil)</span>
              </div>
            </button>
            <button onClick={() => setModo("digital")} className="w-full bg-white border-2 border-blue-100 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-all text-left group">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0 group-hover:bg-blue-100"><Globe size={24} className="text-blue-500" /></div>
              <div>
                <span className="block font-bold text-sm uppercase">Comprar pelo Site</span>
                <span className="text-xs text-slate-400">Escolha, reserve e envie o comprovante por aqui.</span>
              </div>
            </button>
          </div>
          <div className="text-center">
             <span className="inline-block bg-slate-200 text-slate-500 text-[10px] font-bold uppercase px-3 py-1 rounded-full">Sistema Seguro & Transparente</span>
          </div>
        </div>
      )}

      {modo === "tradicional" && (
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative flex flex-col h-auto min-h-[80vh]">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 sticky top-0 z-50">
            <button onClick={() => setModo("inicio")} className="text-white/70 hover:text-white flex items-center gap-1 text-xs font-bold uppercase"><ChevronLeft size={16}/> Voltar</button>
            <h2 className="font-bold text-sm uppercase tracking-wider">Tabela de Números</h2>
            <button onClick={tirarPrintTabela} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors flex flex-col items-center justify-center" title="Salvar imagem da tabela">
              <Camera size={20} />
            </button>
          </div>
          <div className="bg-white flex flex-col pb-24" ref={printRef}>
             <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-slate-100 shrink-0" data-html2canvas-ignore>
                <button onClick={() => setLote((l) => Math.max(0, l - 1))} disabled={lote === 0} className="p-2 bg-slate-100 rounded-lg disabled:opacity-30 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all"><ChevronLeft size={24}/></button>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {lote + 1} de 10</span>
                  <span className="text-lg font-black text-slate-800">{textoPaginacao}</span>
                </div>
                <button onClick={() => setLote((l) => Math.min(9, l + 1))} disabled={lote === 9} className="p-2 bg-slate-100 rounded-lg disabled:opacity-30 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all"><ChevronRight size={24}/></button>
              </div>
              <div className="px-4 pt-2 pb-4 text-center bg-white">
                 <div className="flex justify-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                   <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background: '#ffffff', border: '1px solid #cbd5e1'}}></div>Livre</div>
                   <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background: '#fcd34d', border: '1px solid #f59e0b'}}></div>Reservado</div>
                   <div className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{background: '#dc2626', border: '1px solid #b91c1c'}}></div>Indisponível</div>
                 </div>
              </div>
              <div className="px-6 pb-6 bg-white">
                <div className="grid grid-cols-10 gap-1.5 mx-auto">
                  {numerosLote.map((n: NumeroRifa) => (
                    <div 
                      key={n.numero} 
                      className="aspect-square flex items-center justify-center rounded-[4px] text-[11px] font-black border"
                      style={{
                        backgroundColor: n.status === 'pago' ? '#dc2626' : n.status === 'reservado' ? '#fcd34d' : '#ffffff',
                        borderColor: n.status === 'pago' ? '#b91c1c' : n.status === 'reservado' ? '#f59e0b' : '#cbd5e1',
                        color: n.status === 'pago' ? '#ffffff' : n.status === 'reservado' ? '#0f172a' : '#64748b'
                      }}
                    >
                      {formatarNumero(n.numero)}
                    </div>
                  ))}
                </div>
              </div>
          </div>
          <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] fixed bottom-0 left-0 right-0 z-50 md:absolute md:w-full">
            <button onClick={falarComDonoDireto} className="w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-100 uppercase tracking-wide animate-pulse">
              <Smartphone size={24} /> Enviar Pedido no WhatsApp
            </button>
          </div>
        </div>
      )}

      {modo === "digital" && (
        <div className="w-full max-w-[450px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden relative flex flex-col h-auto max-h-[98vh] transition-all duration-300 animate-in slide-in-from-right">
          <div className="pt-5 pb-3 px-6 border-b border-slate-50 flex items-center justify-between bg-white z-20 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => setModo("inicio")} className="p-1 -ml-2 text-slate-400 hover:text-blue-600"><ChevronLeft size={20}/></button>
              <div><h1 className="text-lg font-bold text-slate-900 leading-tight">Rifa Xbox One X</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Edição Especial 1TB</p></div>
            </div>
            {whatsapp.length >= 14 && (<button onClick={() => setVendoMeusPedidos(!vendoMeusPedidos)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border ${vendoMeusPedidos ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"}`}>{vendoMeusPedidos ? <X size={14} /> : <Ticket size={14} />}{vendoMeusPedidos ? "Fechar" : "Meus Bilhetes"}</button>)}
          </div>
          {mostrarAjuda && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl relative">
                <button onClick={() => setMostrarAjuda(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Info size={20} className="text-blue-600"/> Legenda</h3>
                <div className="space-y-4">
                  <div className="flex gap-3"><div className="w-4 h-4 rounded bg-white border border-slate-300 shadow-sm mt-1 shrink-0"></div><div><p className="font-bold text-sm text-slate-700">Livre</p><p className="text-xs text-slate-500">Disponível para compra.</p></div></div>
                  <div className="flex gap-3"><div className="w-4 h-4 rounded bg-amber-300 border border-amber-400 mt-1 shrink-0"></div><div><p className="font-bold text-sm text-amber-700">Reservado</p><p className="text-xs text-slate-500">Aguardando pagamento.</p></div></div>
                  <div className="flex gap-3"><div className="w-4 h-4 rounded bg-red-500 border border-red-600 mt-1 shrink-0"></div><div><p className="font-bold text-sm text-red-700">Indisponível</p><p className="text-xs text-slate-500">Já tem dono.</p></div></div>
                </div>
                <button onClick={() => setMostrarAjuda(false)} className="mt-6 w-full h-10 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 transition-colors">Entendi</button>
              </div>
            </div>
          )}
          {vendoMeusPedidos ? (
            <div className="flex-1 p-6 animate-in fade-in slide-in-from-bottom-4 bg-slate-50/50 overflow-y-auto">
              {NUMERO_GANHADOR !== null && (
                <div className="bg-purple-600 p-3 rounded-lg text-white text-center mb-3">
                  <p className="text-[10px] font-bold uppercase opacity-80">Número Sorteado</p>
                  <div className="text-2xl font-black">#{formatarNumero(NUMERO_GANHADOR)}</div>
                </div>
              )}
              {pendentes.length > 0 ? (
                <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm space-y-4">
                  <div className="flex flex-col gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-red-800">
                    <div className="flex items-center gap-2"><AlertTriangle size={20} className="shrink-0 text-red-600" /><span className="text-xs font-black uppercase">Atenção: Não é automático!</span></div>
                    <p className="text-[11px] leading-tight opacity-90">O sistema não baixa seu PIX sozinho. Se você não enviar o comprovante no botão verde abaixo, <strong>seus números não serão validados.</strong></p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">1. Copie o PIX</span>
                      <button onClick={copiarPix} className="w-full bg-slate-50 border border-slate-200 active:bg-blue-50 active:border-blue-300 rounded-lg h-11 flex items-center justify-between px-3 transition-all"><code className="text-sm font-bold text-slate-700 truncate mr-2">{CHAVE_PIX_FORMATADA}</code><Copy size={16} className="text-slate-400" /></button>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">2. Envie o Comprovante (Obrigatório)</span>
                      <button onClick={enviarComprovante} className="w-full h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm uppercase tracking-wide"><Send size={16} /> Enviar Comprovante Agora</button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-50 text-center"><span className="text-[10px] text-slate-400 uppercase font-bold">Seus Números: </span><span className="text-xs font-bold text-slate-700">{pendentes.map(n => formatarNumero(n.numero)).join(", ")}</span></div>
                </div>
              ) : null}
              {confirmados.length > 0 && (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm mt-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-700 mb-1"><Check size={16} strokeWidth={3} /><span className="text-sm font-bold uppercase">Pagamento Confirmado</span></div>
                  <div className="flex flex-wrap justify-center gap-1.5">{confirmados.map(n => <span key={n.numero} className="px-2 py-1 bg-white border border-emerald-200 text-emerald-700 rounded text-xs font-bold">#{formatarNumero(n.numero)}</span>)}</div>
                </div>
              )}
              {pendentes.length === 0 && (
                <button onClick={() => { setVendoMeusPedidos(false); setEtapa(2); }} className="w-full mt-6 h-12 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2">Comprar mais números</button>
              )}
            </div>
          ) : (
            <>
              <div className="w-full h-1 bg-slate-100 shrink-0"><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(etapa / 2) * 100}%` }} /></div>
              {etapa === 1 && (
                <div className="flex-1 flex flex-col animate-in fade-in">
                  <div className="relative w-full aspect-video bg-slate-100 overflow-hidden group">
                    <div className="flex transition-transform duration-500 ease-out h-full" style={{ transform: `translateX(-${imagemAtual * 100}%)` }}>
                      {premios.map((premio, idx) => (
                        <div key={idx} className="min-w-full h-full relative flex items-center justify-center bg-white">
                          <img src={premio.url} alt={premio.title} className="w-full h-full object-contain p-4" />
                          <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase tracking-wider">{premio.badge}</div>
                          <div className="absolute bottom-16 w-full text-center"><span className="bg-black/50 text-white/90 text-[8px] px-2 py-0.5 rounded uppercase font-bold tracking-widest backdrop-blur-sm">Imagens Ilustrativas</span></div>
                          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4 pt-10"><h3 className="text-white font-bold text-lg">{premio.title}</h3><p className="text-slate-200 text-xs">{premio.desc}</p></div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setImagemAtual((i) => (i === 0 ? premios.length - 1 : i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-800/20 hover:bg-slate-800/50 text-white p-2 rounded-full transition-all"><ChevronLeft size={24}/></button>
                    <button onClick={() => setImagemAtual((i) => (i === premios.length - 1 ? 0 : i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800/20 hover:bg-slate-800/50 text-white p-2 rounded-full transition-all"><ChevronRight size={24}/></button>
                    <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1.5 z-20">{premios.map((_, idx) => (<div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === imagemAtual ? 'bg-white scale-125' : 'bg-white/40'}`} />))}</div>
                  </div>
                  <div className="px-6 pt-4">
                    <button onClick={() => setMostrarDetalhes(!mostrarDetalhes)} className="w-full flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 p-3 rounded-lg transition-all border border-slate-200"><span className="flex items-center gap-2"><AlertCircle size={16} /> Ver condições reais de uso (Transparência)</span>{mostrarDetalhes ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                    {mostrarDetalhes && (<div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-2 animate-in slide-in-from-top-2"><p><strong>🕹️ Console (8 Anos):</strong> Bem conservado. Recomenda-se limpeza interna e troca de pasta térmica pelo tempo de uso. Acompanha fonte e cabo HDMI.</p><p><strong>🎮 Controle Preto:</strong> Original. O botão LT (mira) tem retorno um pouco lento, mas funciona. Desgaste natural nos analógicos.</p><p><strong>🎮 Controle Branco:</strong> Original. Desgaste estético na parte inferior direita (apoio) e nos analógicos.</p><p><strong>🔋 Extra:</strong> Acompanha carregador de pilhas Duracell.</p><p><strong>💿 Jogos:</strong> Mídia física em ótimo estado de conservação.</p></div>)}
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-start gap-3"><Clock className="text-blue-600 shrink-0 mt-0.5" size={16} /><div><p className="text-xs font-bold text-slate-700 uppercase">Sorteio: {DATA_SORTEIO}</p><p className="text-[10px] text-slate-500">*Data sujeita a antecipação conforme a venda dos números.</p></div></div>
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome Completo</label><input type="text" placeholder="Seu nome" disabled={usuarioIdentificado} className={`w-full h-11 px-4 rounded-lg border outline-none transition-all text-sm ${usuarioIdentificado ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500'}`} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
                      <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">WhatsApp</label><input type="tel" placeholder="(11) 99999-9999" disabled={usuarioIdentificado} className={`w-full h-11 px-4 rounded-lg border outline-none transition-all text-sm ${usuarioIdentificado ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500'}`} value={whatsapp} onChange={handleWhatsappChange} /></div>
                    </div>
                    <button disabled={!nome || whatsapp.length < 14} onClick={() => { localStorage.setItem("rifa_user_zap", whatsapp); localStorage.setItem("rifa_user_nome", nome); setUsuarioIdentificado(true); setEtapa(2); }} className="w-full h-12 bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md">Continuar <ArrowRight size={16} /></button>
                  </div>
                </div>
              )}
              {etapa === 2 && (
                <div className="flex flex-col h-full min-h-0 animate-in fade-in">
                  <div className="py-2 px-4 text-center shrink-0 bg-slate-50/50 border-b border-slate-100">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center justify-center gap-1.5"><Ticket size={16} className="text-blue-600"/> 1.000 NÚMEROS DISPONÍVEIS</h2>
                    <div className="flex justify-center gap-3 mt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500"><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-white border border-slate-300 shadow-sm"></div>Livre</div><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-300 border border-amber-400"></div>Reservado</div><div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500 border border-red-600"></div>Indisponível</div></div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
                    <button onClick={() => setLote((l) => Math.max(0, l - 1))} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black text-slate-700 shadow-sm hover:shadow-md active:scale-95 transition-all"><ChevronLeft size={14} /> ANTERIOR</button>
                    <div className="text-center"><span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {lote + 1} de 10</span><span className="text-xs font-black text-slate-800">({textoPaginacao})</span></div>
                    <button onClick={() => setLote((l) => Math.min(9, l + 1))} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black text-slate-700 shadow-sm hover:shadow-md active:scale-95 transition-all">PRÓXIMA <ChevronRight size={14} /></button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30">
                    <div className="grid grid-cols-10 gap-1.5 w-full max-w-[380px] mx-auto">
                      {numerosLote.map((n: NumeroRifa) => (
                        <button 
                          key={n.numero} 
                          disabled={n.status !== "disponivel"} 
                          onClick={() => toggleNumero(n.numero, n.status)} 
                          className={`aspect-square flex items-center justify-center rounded-[4px] text-[11px] font-black transition-all border
                          ${n.status === "pago" ? "bg-[#dc2626] text-white border-[#b91c1c] opacity-90 cursor-not-allowed" : ""} 
                          ${n.status === "reservado" ? "bg-[#fcd34d] text-slate-900 border-[#f59e0b] cursor-not-allowed" : ""} 
                          ${n.status === "disponivel" && !selecionados.includes(n.numero) ? "bg-white text-slate-500 border-slate-300 shadow-sm hover:border-blue-400 hover:text-blue-600" : ""} 
                          ${selecionados.includes(n.numero) ? "bg-blue-600 text-white border-blue-600 scale-105 z-10 shadow-md" : ""}`}
                        >
                          {formatarNumero(n.numero)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-white shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20 space-y-3">
                    {selecionados.length > 0 ? (
                      <button onClick={finalizarCompra} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-between px-6 animate-in slide-in-from-bottom-2 shadow-lg shadow-blue-100 transition-all transform hover:scale-[1.02]">
                        <div className="flex flex-col items-start"><span className="text-[10px] font-bold text-blue-100 uppercase tracking-wide">Total a Pagar</span><span className="text-xl leading-none">R$ {(selecionados.length * 5).toFixed(2)}</span></div>
                        <div className="flex items-center gap-2 text-sm uppercase tracking-wide">Pagar Agora <ArrowRight size={18} strokeWidth={3} /></div>
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wide py-3 bg-amber-50 rounded-lg border border-amber-200 border-dashed"><Ticket size={16}/> Dica: Você pode escolher vários!</div>
                    )}
                    <button onClick={voltarParaCadastro} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"><ChevronLeft size={14} /> Voltar e corrigir meus dados</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}