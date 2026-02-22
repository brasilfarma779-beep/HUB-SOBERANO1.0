/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Camera, 
  Plus, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Briefcase, 
  DollarSign,
  ChevronRight,
  Loader2,
  Trash2,
  Smartphone,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Seller {
  id: number;
  name: string;
  phone: string;
  commission_rate: number;
  created_at: string;
}

interface Item {
  description: string;
  price: number | null;
}

interface Maleta {
  id: number;
  seller_id: number;
  seller_name: string;
  status: string;
  photo_url: string;
  total_bruto: number;
  commission_value: number;
  estimated_profit: number;
  delivery_date: string;
  return_date: string;
  created_at: string;
}

interface Stats {
  total_maletas: number;
  maletas_em_campo: number;
  total_profit_estimated: number;
  total_bruto: number;
  ranking: { name: string; total_value: number }[];
}

// --- Components ---

const Card = ({ children, className = "", ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className = "",
  icon: Icon
}: { 
  children?: React.ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success';
  disabled?: boolean;
  className?: string;
  icon?: any;
}) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    ghost: 'text-zinc-600 hover:bg-zinc-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendedoras' | 'scanner'>('dashboard');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  // Scanner State
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [editingSellerId, setEditingSellerId] = useState<number | null>(null);
  const [editingMaletaId, setEditingMaletaId] = useState<number | null>(null);
  const [newSeller, setNewSeller] = useState({ name: '', phone: '', commission_rate: 0.3 });
  const [maletas, setMaletas] = useState<Maleta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSellers();
    fetchStats();
    fetchMaletas();
  }, []);

  const fetchMaletas = async () => {
    const res = await fetch('/api/maletas');
    const data = await res.json();
    setMaletas(data);
  };

  const fetchSellers = async () => {
    const res = await fetch('/api/sellers');
    const data = await res.json();
    setSellers(data);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const handleAddSeller = async () => {
    if (!newSeller.name || !newSeller.phone) return;
    const res = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeller)
    });
    if (res.ok) {
      setShowAddSeller(false);
      setEditingSellerId(null);
      setNewSeller({ name: '', phone: '', commission_rate: 0.3 });
      fetchSellers();
    }
  };

  const handleEditSeller = (seller: Seller) => {
    setEditingSellerId(seller.id);
    setNewSeller({ name: seller.name, phone: seller.phone, commission_rate: seller.commission_rate });
    setShowAddSeller(true);
  };

  const handleUpdateSeller = async () => {
    if (!editingSellerId) return;
    const res = await fetch(`/api/sellers/${editingSellerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeller)
    });
    if (res.ok) {
      setShowAddSeller(false);
      setEditingSellerId(null);
      setNewSeller({ name: '', phone: '', commission_rate: 0.3 });
      fetchSellers();
    }
  };

  const handleDeleteSeller = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta vendedora?')) return;
    const res = await fetch(`/api/sellers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchSellers();
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao excluir vendedora.');
    }
  };

  const handleDeleteMaleta = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta maleta?')) return;
    try {
      const res = await fetch(`/api/maletas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingMaletaId === id) {
          setCapturedImages([]);
          setScannedItems([]);
          setEditingMaletaId(null);
          setActiveTab('dashboard');
        }
        fetchMaletas();
        fetchStats();
      } else {
        const data = await res.json();
        alert(`Não foi possível excluir: ${data.error || 'Erro no servidor'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao excluir maleta.');
    }
  };

  const handleFinalizeMaletaStatus = async (id: number) => {
    if (!confirm('Deseja finalizar esta maleta? Ela sairá da lista de "Em Campo".')) return;
    try {
      const res = await fetch(`/api/maletas/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Finalizada' })
      });
      if (res.ok) {
        if (editingMaletaId === id) {
          setCapturedImages([]);
          setScannedItems([]);
          setEditingMaletaId(null);
          setActiveTab('dashboard');
        }
        fetchMaletas();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllMaletasInCampo = async () => {
    if (!confirm('ATENÇÃO: Tem certeza que deseja excluir TODAS as maletas em campo? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch('/api/maletas/status/Em Campo', { method: 'DELETE' });
      if (res.ok) {
        fetchMaletas();
        fetchStats();
      } else {
        alert('Erro ao excluir todas as maletas.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    }
  };

  const handleSystemReset = async () => {
    if (!confirm('🚨 ATENÇÃO: Isso excluirá PERMANENTEMENTE todas as vendedoras, maletas e itens do sistema. Esta ação NÃO pode ser desfeita. Deseja continuar?')) return;
    if (!confirm('Tem certeza absoluta? Todos os dados serão perdidos.')) return;
    
    try {
      const res = await fetch('/api/system/reset', { method: 'DELETE' });
      if (res.ok) {
        fetchMaletas();
        fetchStats();
        fetchSellers();
        alert('Sistema resetado com sucesso.');
      } else {
        alert('Erro ao resetar o sistema.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão.');
    }
  };

  const handleEditMaleta = async (maleta: Maleta) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/maletas/${maleta.id}/items`);
      const items = await res.json();
      setEditingMaletaId(maleta.id);
      setCapturedImages(maleta.photo_url ? [maleta.photo_url] : []);
      setScannedItems(items);
      setSelectedSellerId(maleta.seller_id);
      setActiveTab('scanner');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    const newImages: string[] = [];
    const allScannedItems: Item[] = [...scannedItems];

    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newImages.push(base64);

      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });
        const data = await res.json();
        if (data.items) {
          allScannedItems.push(...data.items);
        }
      } catch (err) {
        console.error("Error scanning file:", file.name, err);
      }
    }

    setCapturedImages(prev => [...prev, ...newImages]);
    setScannedItems(allScannedItems);
    setIsProcessing(false);
  };

  const updateItemPrice = (index: number, price: string) => {
    const newItems = [...scannedItems];
    newItems[index].price = parseFloat(price) || 0;
    setScannedItems(newItems);
  };

  const removeItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const totalBruto = scannedItems.reduce((acc, item) => acc + (item.price || 0), 0);
  const selectedSeller = sellers.find(s => s.id === selectedSellerId);
  const commissionRate = selectedSeller?.commission_rate || 0.3;
  const commissionValue = totalBruto * commissionRate;
  const estimatedProfit = totalBruto - commissionValue;

  const handleFinalizeMaleta = async () => {
    if (!selectedSellerId || scannedItems.length === 0) return;
    
    setLoading(true);
    try {
      const url = editingMaletaId ? `/api/maletas/${editingMaletaId}` : '/api/maletas';
      const method = editingMaletaId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: selectedSellerId,
          photo_url: capturedImages[0] || null,
          items: scannedItems,
          total_bruto: totalBruto,
          commission_value: commissionValue,
          estimated_profit: estimatedProfit
        })
      });

      if (res.ok) {
        // WhatsApp Integration Simulation
        const message = `💎 HUB SOBERANO - Relatório de ${editingMaletaId ? 'Atualização' : 'Entrega'}\n\n👤 Vendedora: ${selectedSeller?.name}\n📅 Data: ${new Date().toLocaleDateString()}\n\n📦 Itens na Maleta:\n${scannedItems.map(i => `- ${i.description}: R$ ${i.price?.toFixed(2)}`).join('\n')}\n\n💰 Valor Total: R$ ${totalBruto.toFixed(2)}\n💵 Sua Comissão: R$ ${commissionValue.toFixed(2)}`;
        
        const whatsappUrl = `https://wa.me/${selectedSeller?.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        // Reset
        setCapturedImages([]);
        setScannedItems([]);
        setSelectedSellerId(null);
        setEditingMaletaId(null);
        setActiveTab('dashboard');
        fetchStats();
        fetchMaletas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-bottom border-black/5 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">HUB SOBERANO</h1>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Gestão de Maletas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { fetchMaletas(); fetchStats(); fetchSellers(); }}
              className="p-2 text-zinc-400 hover:text-black transition-colors"
              title="Recarregar Dados"
            >
              <Loader2 className={loading ? "animate-spin" : ""} size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-zinc-600">SISTEMA ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Buscar por vendedora ou valor (ex: 135)..."
                  className="w-full p-4 pl-12 bg-white border border-black/5 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Loader2 className={loading ? "animate-spin" : ""} size={20} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-black text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <Briefcase size={20} />
                    </div>
                    <span className="text-xs font-medium text-white/50">EM CAMPO</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats?.maletas_em_campo || 0}</div>
                  <div className="text-sm text-white/60">Maletas Ativas</div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <DollarSign size={20} />
                    </div>
                    <span className="text-xs font-medium text-zinc-400">LUCRO PREVISTO</span>
                  </div>
                  <div className="text-3xl font-bold mb-1 text-emerald-600">
                    R$ {stats?.total_profit_estimated?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  <div className="text-sm text-zinc-500">Retorno Estimado</div>
                </Card>

                <Card className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-zinc-50 rounded-lg text-zinc-600">
                      <TrendingUp size={20} />
                    </div>
                    <span className="text-xs font-medium text-zinc-400">VALOR TOTAL</span>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    R$ {stats?.total_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  <div className="text-sm text-zinc-500">Mercadoria na Rua</div>
                </Card>
              </div>

              {/* Ranking & Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Ranking de Vendas
                  </h2>
                  <Card>
                    <div className="divide-y divide-zinc-100">
                      {stats?.ranking.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-zinc-300 w-6">0{idx + 1}</span>
                            <div>
                              <div className="font-bold">{item.name}</div>
                              <div className="text-xs text-zinc-500">Vendedora Parceira</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">R$ {item.total_value.toLocaleString('pt-BR')}</div>
                            <div className="text-[10px] font-bold text-zinc-400 uppercase">Volume Total</div>
                          </div>
                        </div>
                      ))}
                      {stats?.ranking.length === 0 && (
                        <div className="p-8 text-center text-zinc-400">Nenhum dado disponível ainda.</div>
                      )}
                    </div>
                  </Card>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Briefcase size={18} className="text-zinc-500" />
                      Maletas em Campo
                    </h2>
                    {maletas.filter(m => m.status === 'Em Campo').length > 0 && (
                      <button 
                        onClick={handleDeleteAllMaletasInCampo}
                        className="text-[10px] font-bold text-red-500 uppercase hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Excluir Todas
                      </button>
                    )}
                  </div>
                  <Card>
                    <div className="divide-y divide-zinc-100">
                      {maletas.filter(m => 
                        m.status === 'Em Campo' && 
                        (m.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.total_bruto.toString().includes(searchTerm))
                      ).map((maleta) => (
                        <div key={maleta.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100">
                              {maleta.photo_url && <img src={maleta.photo_url} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <div className="font-bold">{maleta.seller_name}</div>
                              <div className="text-xs text-zinc-500">Devolução: {new Date(maleta.return_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-bold">R$ {maleta.total_bruto.toLocaleString('pt-BR')}</div>
                                <div className="text-[10px] font-bold text-emerald-600 uppercase">Lucro: R$ {maleta.estimated_profit.toLocaleString('pt-BR')}</div>
                              </div>
                              <button 
                                onClick={() => handleFinalizeMaletaStatus(maleta.id)}
                                className="p-2 text-zinc-300 hover:text-emerald-500 transition-colors"
                                title="Finalizar Maleta (Baixa)"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleEditMaleta(maleta)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-black hover:text-white rounded-lg transition-all text-xs font-bold"
                              >
                                <ChevronRight size={14} />
                                EDITAR
                              </button>
                              <button 
                                onClick={() => handleDeleteMaleta(maleta.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition-all text-xs font-bold"
                              >
                                <Trash2 size={14} />
                                EXCLUIR
                              </button>
                            </div>
                        </div>
                      ))}
                      {maletas.filter(m => 
                        m.status === 'Em Campo' && 
                        (m.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.total_bruto.toString().includes(searchTerm))
                      ).length === 0 && (
                        <div className="p-8 text-center text-zinc-400">
                          {searchTerm ? 'Nenhuma maleta encontrada para esta busca.' : 'Nenhuma maleta em campo.'}
                        </div>
                      )}
                    </div>
                  </Card>
                </section>
              </div>

              {/* Finalized Maletas History */}
              <section className="mt-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Histórico de Maletas (Finalizadas)
                  </h2>
                  {maletas.filter(m => m.status === 'Finalizada').length > 0 && (
                    <button 
                      onClick={() => { if(confirm('Excluir todo o histórico?')) fetch('/api/maletas/status/Finalizada', { method: 'DELETE' }).then(() => { fetchMaletas(); fetchStats(); }); }}
                      className="text-[10px] font-bold text-zinc-400 uppercase hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Limpar Histórico
                    </button>
                  )}
                </div>
                <Card>
                  <div className="divide-y divide-zinc-100">
                    {maletas.filter(m => 
                      m.status === 'Finalizada' && 
                      (m.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       m.total_bruto.toString().includes(searchTerm))
                    ).map((maleta) => (
                      <div key={maleta.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 opacity-50">
                            {maleta.photo_url && <img src={maleta.photo_url} className="w-full h-full object-cover grayscale" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-500">{maleta.seller_name}</div>
                            <div className="text-[10px] text-zinc-400">Finalizada em: {new Date(maleta.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-zinc-400">R$ {maleta.total_bruto.toLocaleString('pt-BR')}</div>
                          </div>
                          <button 
                            onClick={() => handleDeleteMaleta(maleta.id)}
                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {maletas.filter(m => 
                      m.status === 'Finalizada' && 
                      (m.seller_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       m.total_bruto.toString().includes(searchTerm))
                    ).length === 0 && (
                      <div className="p-8 text-center text-zinc-400">
                        {searchTerm ? 'Nenhum registro encontrado no histórico.' : 'Nenhuma maleta finalizada ainda.'}
                      </div>
                    )}
                  </div>
                </Card>
              </section>

              {/* Danger Zone */}
              <section className="mt-12 pt-8 border-t border-red-100">
                <div className="flex items-center justify-between p-6 bg-red-50 rounded-2xl border border-red-100">
                  <div>
                    <h3 className="text-red-800 font-bold flex items-center gap-2">
                      <AlertCircle size={18} />
                      Zona de Perigo
                    </h3>
                    <p className="text-sm text-red-600">Exclua permanentemente todos os dados do sistema para começar do zero.</p>
                  </div>
                  <button 
                    onClick={handleSystemReset}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-95"
                  >
                    RESETAR SISTEMA
                  </button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'vendedoras' && (
            <motion.div 
              key="vendedoras"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Vendedoras</h2>
                <Button icon={Plus} onClick={() => setShowAddSeller(true)}>Nova Vendedora</Button>
              </div>

              {showAddSeller && (
                <Card className="p-6 border-2 border-black/10">
                  <h3 className="font-bold mb-4">{editingSellerId ? 'Editar Vendedora' : 'Cadastrar Nova Vendedora'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <input 
                      placeholder="Nome Completo" 
                      className="p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-black"
                      value={newSeller.name}
                      onChange={e => setNewSeller({...newSeller, name: e.target.value})}
                    />
                    <input 
                      placeholder="WhatsApp (ex: 11999999999)" 
                      className="p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-black"
                      value={newSeller.phone}
                      onChange={e => setNewSeller({...newSeller, phone: e.target.value})}
                    />
                    <div className="flex items-center gap-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                      <span className="text-xs font-bold text-zinc-400">COMISSÃO</span>
                      <input 
                        type="number"
                        step="0.01"
                        className="w-full font-bold outline-none bg-transparent"
                        value={newSeller.commission_rate}
                        onChange={e => setNewSeller({...newSeller, commission_rate: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={editingSellerId ? handleUpdateSeller : handleAddSeller} className="flex-1">
                      {editingSellerId ? 'Atualizar Vendedora' : 'Salvar Vendedora'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowAddSeller(false); setEditingSellerId(null); setNewSeller({ name: '', phone: '', commission_rate: 0.3 }); }}>
                      Cancelar
                    </Button>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellers.map((seller) => (
                  <Card key={seller.id} className="p-5 hover:border-black/20 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:bg-black group-hover:text-white transition-colors">
                        <Users size={24} />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase block">Comissão</span>
                        <span className="font-bold text-emerald-600">{(seller.commission_rate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{seller.name}</h3>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                      <Smartphone size={14} />
                      {seller.phone}
                    </div>
                    <div className="pt-4 border-t border-zinc-100 flex gap-2">
                      <Button variant="outline" className="flex-1 text-xs py-2" onClick={() => handleEditSeller(seller)}>Editar</Button>
                      <Button variant="secondary" className="px-3 text-red-500" icon={Trash2} onClick={() => handleDeleteSeller(seller.id)} />
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'scanner' && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              {capturedImages.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[4/3] border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-50 hover:border-black/20 transition-all group"
                >
                  <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 group-hover:scale-110 group-hover:bg-black group-hover:text-white transition-all duration-500">
                    <Camera size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-xl mb-1">Scanner de Maletas</h3>
                    <p className="text-zinc-500">Tire fotos ou escolha da galeria (Múltiplas)</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs px-6">
                    <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); setCapturedImages(['https://picsum.photos/seed/maleta/800/600']); setScannedItems([{ description: 'Nova Peça', price: 0 }]); }}>
                      Pular Foto (Manual)
                    </Button>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    multiple
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleImageCapture}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Image Preview Gallery */}
                  <div className="relative rounded-3xl overflow-hidden bg-zinc-100 border border-black/5 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {capturedImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                          <img src={img} className="w-full h-full object-cover" alt={`Captured ${idx}`} />
                          <button 
                            onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:bg-white hover:border-black transition-all"
                      >
                        <Plus size={24} />
                        <span className="text-[10px] font-bold uppercase mt-1">Add Foto</span>
                      </button>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                        <Loader2 className="animate-spin mb-4" size={40} />
                        <p className="font-bold text-lg">Processando Fotos...</p>
                        <p className="text-sm text-white/60">A IA está analisando {capturedImages.length} imagens</p>
                        
                        <motion.div 
                          className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                      {editingMaletaId && (
                        <button 
                          onClick={() => handleFinalizeMaletaStatus(editingMaletaId)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full backdrop-blur-md shadow-lg transition-colors"
                          title="Dar Baixa / Finalizar Maleta"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      )}
                      <button 
                        onClick={() => { if(editingMaletaId) handleDeleteMaleta(editingMaletaId); }}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-lg transition-colors"
                        title="Excluir Maleta Permanentemente"
                      >
                        <Trash2 size={20} />
                      </button>
                      <button 
                        onClick={() => { setCapturedImages([]); setEditingMaletaId(null); setScannedItems([]); }}
                        className="p-2 bg-black/50 hover:bg-black text-white rounded-full backdrop-blur-md shadow-lg transition-colors"
                        title="Fechar / Cancelar"
                      >
                        <Plus className="rotate-45" size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Seller Selection */}
                  <section>
                    <label className="text-sm font-bold text-zinc-500 uppercase mb-2 block">Vendedora Responsável</label>
                    <select 
                      className="w-full p-4 rounded-2xl border border-zinc-200 bg-white font-medium focus:ring-2 focus:ring-black outline-none transition-all"
                      value={selectedSellerId || ''}
                      onChange={(e) => setSelectedSellerId(Number(e.target.value))}
                    >
                      <option value="">Selecione uma vendedora...</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </section>

                  {/* Items List */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{editingMaletaId ? 'Editar Conteúdo' : 'Itens Identificados'}</h3>
                      <span className="text-xs font-bold px-2 py-1 bg-zinc-100 rounded-md text-zinc-500 uppercase">
                        {scannedItems.length} Peças
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {scannedItems.map((item, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={idx} 
                          className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-zinc-100"
                        >
                          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 shrink-0">
                            {idx + 1}
                          </div>
                          <input 
                            className="flex-1 font-medium outline-none bg-transparent"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...scannedItems];
                              newItems[idx].description = e.target.value;
                              setScannedItems(newItems);
                            }}
                          />
                          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-xl border border-zinc-100">
                            <span className="text-xs font-bold text-zinc-400">R$</span>
                            <input 
                              type="number"
                              className="w-20 font-bold outline-none bg-transparent text-right"
                              placeholder="0,00"
                              value={item.price || ''}
                              onChange={(e) => updateItemPrice(idx, e.target.value)}
                            />
                          </div>
                          <button 
                            onClick={() => removeItem(idx)}
                            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full border-dashed border-2 py-4" 
                        icon={Plus}
                        onClick={() => setScannedItems([...scannedItems, { description: 'Novo Item', price: 0 }])}
                      >
                        Adicionar Item Manualmente
                      </Button>
                    </div>
                  </section>

                  {/* Summary & Action */}
                  <Card className="p-6 bg-zinc-900 text-white">
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-zinc-400">
                        <span>Total Bruto</span>
                        <span className="font-bold text-white">R$ {totalBruto.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Comissão ({(commissionRate * 100).toFixed(0)}%)</span>
                        <span className="font-bold text-emerald-400">- R$ {commissionValue.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="font-bold text-lg">Lucro Estimado</span>
                        <span className="text-2xl font-bold text-emerald-400">R$ {estimatedProfit.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="success" 
                      className="w-full py-4 text-lg" 
                      icon={Send}
                      disabled={!selectedSellerId || scannedItems.length === 0 || loading}
                      onClick={handleFinalizeMaleta}
                    >
                      {loading ? 'Processando...' : (editingMaletaId ? 'Salvar Alterações' : 'Finalizar e Enviar WhatsApp')}
                    </Button>
                    <p className="text-center text-[10px] text-white/40 mt-4 uppercase tracking-widest font-bold">
                      Isso irá gerar o relatório e abrir o WhatsApp
                    </p>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={LayoutDashboard} 
            label="Início" 
          />
          <div className="relative -top-8">
            <button 
              onClick={() => setActiveTab('scanner')}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${activeTab === 'scanner' ? 'bg-black text-white rotate-90 scale-110' : 'bg-white text-black border border-black/5'}`}
            >
              <Camera size={28} />
            </button>
          </div>
          <NavButton 
            active={activeTab === 'vendedoras'} 
            onClick={() => setActiveTab('vendedoras')} 
            icon={Users} 
            label="Vendedoras" 
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-black scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}
