import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRifa() {
  const [numeros, setNumeros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Busca inicial
  const buscarNumeros = useCallback(async () => {
    const { data } = await supabase
      .from('rifas')
      .select('*')
      .order('numero', { ascending: true });

    if (data) setNumeros(data);
    setLoading(false);
  }, []);

  // 2. Conexão Realtime
  useEffect(() => {
    buscarNumeros();

    // Inscreve no canal para ouvir mudanças
    const channel = supabase
      .channel('rifa_live_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rifas' }, 
        (payload: any) => {
          // Se houve UPDATE (ex: alguém reservou ou pagou)
          if (payload.eventType === 'UPDATE') {
            setNumeros(prev => 
              prev.map(n => n.numero === payload.new.numero ? payload.new : n)
            );
          }
          // Se houve INSERT (raro, mas bom garantir)
          if (payload.eventType === 'INSERT') {
             setNumeros(prev => [...prev, payload.new].sort((a,b) => a.numero - b.numero));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buscarNumeros]);

  async function reservarNumeros(lista: number[], nome: string, whatsapp: string) {
    const pedidoId = Date.now().toString(); 

    const { error } = await supabase
      .from('rifas')
      .update({ 
        status: 'reservado', 
        cliente_nome: nome, 
        cliente_whatsapp: whatsapp,
        pedido_id: pedidoId
      })
      .in('numero', lista);

    return { success: !error, error };
  }

  return { numeros, loading, reservarNumeros, buscarNumeros };
}