// @ts-nocheck
import * as React from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  PlusCircle,
  List,
  Trash2,
  AlertCircle,
  LayoutDashboard,
  Store,
  Calendar,
  Wallet,
  FileText,
  Upload,
  CheckCircle,
  X,
  Clipboard,
  Receipt,
  CalendarDays,
  Clock,
  CheckSquare,
  CreditCard,
  Landmark,
  Edit2,
  Save,
  BarChart3,
  Activity,
  Users,
  RotateCcw,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  setDoc,
} from "firebase/firestore";

const { useState, useEffect, useMemo } = React;

// --- FIREBASE INITIALIZATION ---
// --- INICIALIZAÇÃO DO FIREBASE ---
let app, auth, db, appId;
try {
  const firebaseConfig = {
    apiKey: "AIzaSyAEG9RluhCLP2OUCh8hVPLa1WIk66cBh0Y",
    authDomain: "elite-finance-132e9.firebaseapp.com",
    projectId: "elite-finance-132e9",
    storageBucket: "elite-finance-132e9.firebasestorage.app",
    messagingSenderId: "835867954928",
    appId: "1:835867954928:web:c4075397f712bd6aebbc35",
    measurementId: "G-3V7JH3D9YL",
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = "elite-finance-132e9";
} catch (erro) {
  console.error("Erro ao inicializar Firebase:", erro);
}
// --- CONSTANTS ---
const STORES = ["Loja Centro", "Loja Arena"];

const CATEGORIES = {
  entrada: ["Vendas", "Meios de Pagamento"],
  saida: [
    "Folha Salarial",
    "Aluguéis",
    "Custo de Mercadorias",
    "Entrada de Mercadorias",
    "Despesas Variadas",
    "Taxas/Impostos/Retirada",
    "Marketing",
    "Descontos",
    "Adicionais",
    "Dinheiro Retirado",
    "Excursão/Transporte",
  ],
  contas: [
    "Fornecedores",
    "Aluguel",
    "Energia/Água/Internet",
    "Impostos",
    "Serviços",
    "Outros",
    "Cartão de crédito",
    "Compras de produtos",
    "Prolabore Igor",
    "Prolabore Dieni",
  ],
};

const ALL_ACCOUNTS = [
  { id: "mp_centro", name: "Mercado-Pago (Cartões)", store: "Loja Centro" },
  { id: "cresol_centro", name: "Cresol (Pix)", store: "Loja Centro" },
  { id: "mp_arena", name: "Mercado-Pago (Cartões)", store: "Loja Arena" },
  { id: "cresol_arena", name: "Cresol (Pix)", store: "Loja Arena" },
  { id: "conjunta_boleto", name: "Conta Conjunta (Boletos)", store: "all" },
];

// --- UTILS ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export default function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payables, setPayables] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [bankBalances, setBankBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lancamentos");

  // --- CUSTOM DIALOG STATE ---
  const [dialog, setDialog] = useState(null);

  const showAlert = (message) => {
    setDialog({ type: "alert", message });
  };

  const showConfirm = (message, onConfirm) => {
    setDialog({ type: "confirm", message, onConfirm });
  };

  // --- AUTHENTICATION ---
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro de autenticação:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });

    // --- CARREGAR BIBLIOTECA PDF.JS ---
    if (!document.getElementById("pdfjs-script")) {
      const script = document.createElement("script");
      script.id = "pdfjs-script";
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      };
      document.head.appendChild(script);
    }

    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user || !db) return;

    setLoading(true);

    // Transactions
    const transactionsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "transactions"
    );
    const qTx = query(transactionsRef);
    const unsubscribeTx = onSnapshot(
      qTx,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // OTIMIZAÇÃO: Ordenação em string ultra-rápida (Evita o colapso de memória com 'new Date()')
        data.sort((a, b) => {
          if (a.date > b.date) return -1;
          if (a.date < b.date) return 1;
          return b.createdAt - a.createdAt;
        });
        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao buscar transações:", error);
        setLoading(false);
      }
    );

    // Payables
    const payablesRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "payables"
    );
    const qPay = query(payablesRef);
    const unsubscribePay = onSnapshot(
      qPay,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a, b) => {
          if (a.dueDate < b.dueDate) return -1;
          if (a.dueDate > b.dueDate) return 1;
          return b.createdAt - a.createdAt;
        });
        setPayables(data);
      },
      (error) => {
        console.error("Erro ao buscar contas a pagar:", error);
      }
    );

    // Receivables
    const receivablesRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "receivables"
    );
    const qRec = query(receivablesRef);
    const unsubscribeRec = onSnapshot(
      qRec,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a, b) => {
          if (a.dueDate < b.dueDate) return -1;
          if (a.dueDate > b.dueDate) return 1;
          return b.createdAt - a.createdAt;
        });
        setReceivables(data);
      },
      (error) => {
        console.error("Erro ao buscar contas a receber:", error);
      }
    );

    // Bank Balances
    const balancesRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "settings",
      "bankBalances"
    );
    const unsubscribeBalances = onSnapshot(balancesRef, (docSnap) => {
      if (docSnap.exists()) {
        setBankBalances(docSnap.data());
      } else {
        setBankBalances({});
      }
    });

    return () => {
      unsubscribeTx();
      unsubscribePay();
      unsubscribeRec();
      unsubscribeBalances();
    };
  }, [user]);

  // --- ACTIONS ---
  const handleAddTransaction = async (data) => {
    if (!user || !db) return;
    try {
      const transactionsRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "transactions"
      );
      await addDoc(transactionsRef, {
        ...data,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
      showAlert("Erro ao salvar o lançamento. Tente novamente.");
    }
  };

  const handleDeleteTransaction = (id, silent = false) => {
    if (!user || !db) return;
    const performDelete = async () => {
      try {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "transactions",
          id
        );
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    };

    if (silent) {
      performDelete();
    } else {
      showConfirm(
        "Tem certeza que deseja excluir este lançamento?",
        performDelete
      );
    }
  };

  const handleAddPayable = async (data) => {
    if (!user || !db) return;
    try {
      const payablesRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "payables"
      );
      await addDoc(payablesRef, {
        ...data,
        status: "pendente",
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Erro ao adicionar conta a pagar:", error);
      showAlert("Erro ao salvar a conta.");
    }
  };

  const handleDeletePayable = (id) => {
    if (!user || !db) return;
    showConfirm(
      "Tem certeza que deseja excluir esta conta pendente?",
      async () => {
        try {
          const docRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "payables",
            id
          );
          await deleteDoc(docRef);
        } catch (error) {
          console.error("Erro ao deletar conta:", error);
        }
      }
    );
  };

  const handleEditPayable = async (id, updatedData) => {
    if (!user || !db) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "payables",
        id
      );
      await setDoc(docRef, updatedData, { merge: true });
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      showAlert("Erro ao atualizar a conta.");
    }
  };

  const handleAddReceivable = async (data, silent = false) => {
    if (!user || !db) return;
    try {
      const receivablesRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "receivables"
      );
      await addDoc(receivablesRef, {
        ...data,
        status: "pendente",
        createdAt: Date.now(),
      });
      if (!silent)
        showAlert("Valor pendente (Crediário) registrado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar conta a receber:", error);
      if (!silent) showAlert("Erro ao salvar o valor pendente.");
    }
  };

  const handlePayBill = (payable) => {
    if (!user || !db) return;
    showConfirm(
      `Confirmar o pagamento de ${
        payable.description || payable.category
      } no valor de ${formatCurrency(payable.amount)}?`,
      async () => {
        try {
          await handleAddTransaction({
            store: payable.store,
            type: "saida",
            category: "Despesas Variadas",
            amount: payable.amount,
            date: getTodayDateString(),
            description: `Pagamento Conta: ${
              payable.description || payable.category
            }`,
          });

          const docRef = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "payables",
            payable.id
          );
          await deleteDoc(docRef);

          showAlert(
            "Conta quitada e registrada com sucesso nos Lançamentos Diários!"
          );
        } catch (error) {
          console.error("Erro ao processar pagamento:", error);
        }
      }
    );
  };

  const handleUpdateBalance = async (accountKey, newValue) => {
    if (!user || !db) return;
    try {
      const balancesRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "settings",
        "bankBalances"
      );
      await setDoc(balancesRef, { [accountKey]: newValue }, { merge: true });
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-800 font-semibold">
            Carregando Elite Finance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shadow-xl flex flex-col z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Building2 size={24} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-500">
              ELITE
            </h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase">
              Finance
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarButton
            active={activeTab === "lancamentos"}
            onClick={() => setActiveTab("lancamentos")}
            icon={<PlusCircle size={20} />}
            label="Lançamentos Diários"
          />
          <SidebarButton
            active={activeTab === "contas-pagar"}
            onClick={() => setActiveTab("contas-pagar")}
            icon={<Receipt size={20} />}
            label="Contas a Pagar"
          />
          <SidebarButton
            active={activeTab === "relatorios"}
            onClick={() => setActiveTab("relatorios")}
            icon={<BarChart3 size={20} />}
            label="Gráficos e Relatórios"
          />
          <div className="pt-4 pb-2">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-3">
              Dashboards
            </p>
          </div>
          <SidebarButton
            active={activeTab === "visao-geral"}
            onClick={() => setActiveTab("visao-geral")}
            icon={<LayoutDashboard size={20} />}
            label="Visão Geral"
          />
          <SidebarButton
            active={activeTab === "centro"}
            onClick={() => setActiveTab("centro")}
            icon={<Store size={20} />}
            label="Loja Centro"
          />
          <SidebarButton
            active={activeTab === "arena"}
            onClick={() => setActiveTab("arena")}
            icon={<Store size={20} />}
            label="Loja Arena"
          />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "lancamentos" && (
          <DailyEntry
            onAdd={handleAddTransaction}
            transactions={transactions}
            onDelete={handleDeleteTransaction}
            onAddReceivable={handleAddReceivable}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
        {activeTab === "contas-pagar" && (
          <PayablesEntry
            onAdd={handleAddPayable}
            payables={payables}
            onDelete={handleDeletePayable}
            onEdit={handleEditPayable}
            onPay={handlePayBill}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
        {activeTab === "relatorios" && (
          <ReportsTab transactions={transactions} />
        )}
        {activeTab === "visao-geral" && (
          <Dashboard
            transactions={transactions}
            payables={payables}
            receivables={receivables}
            bankBalances={bankBalances}
            onUpdateBalance={handleUpdateBalance}
            store="all"
            title="Visão Geral Corporativa"
          />
        )}
        {activeTab === "centro" && (
          <Dashboard
            transactions={transactions}
            payables={payables}
            receivables={receivables}
            bankBalances={bankBalances}
            onUpdateBalance={handleUpdateBalance}
            store="Loja Centro"
            title="Dashboard - Loja Centro"
          />
        )}
        {activeTab === "arena" && (
          <Dashboard
            transactions={transactions}
            payables={payables}
            receivables={receivables}
            bankBalances={bankBalances}
            onUpdateBalance={handleUpdateBalance}
            store="Loja Arena"
            title="Dashboard - Loja Arena"
          />
        )}
      </main>

      {/* MODAL GLOBAL (Alerts e Confirms Customizados) */}
      {dialog && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 opacity-100">
            <h3
              className={`text-xl font-bold mb-3 ${
                dialog.type === "confirm" ? "text-rose-600" : "text-slate-800"
              }`}
            >
              {dialog.type === "confirm" ? "Atenção" : "Aviso"}
            </h3>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed whitespace-pre-wrap">
              {dialog.message}
            </p>
            <div className="flex justify-end space-x-3">
              {dialog.type === "confirm" && (
                <button
                  onClick={() => setDialog(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === "confirm" && dialog.onConfirm) {
                    dialog.onConfirm();
                  }
                  setDialog(null);
                }}
                className={`px-4 py-2 text-white rounded-lg font-semibold transition-colors ${
                  dialog.type === "confirm"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-indigo-500 hover:bg-indigo-600"
                }`}
              >
                {dialog.type === "confirm" ? "Sim, Confirmar" : "OK, Entendi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTS ---

function SidebarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        active
          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function DailyEntry({
  onAdd,
  transactions,
  onDelete,
  onAddReceivable,
  showAlert,
  showConfirm,
}) {
  const [store, setStore] = useState(STORES[0]);
  const [type, setType] = useState("entrada");
  const [category, setCategory] = useState(CATEGORIES.entrada[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  // Estados para Fechamento Manual
  const [registroTipo, setRegistroTipo] = useState("fechamento"); // 'fechamento' ou 'avulso'
  const [vendaTotal, setVendaTotal] = useState("");
  const [custoTotal, setCustoTotal] = useState("");
  const [descontoTotal, setDescontoTotal] = useState("");
  const [despesaTotal, setDespesaTotal] = useState("");
  const [adicionalTotal, setAdicionalTotal] = useState("");

  // Estados para Importação de PDF (Fechamento)
  const [pdfStore, setPdfStore] = useState(STORES[0]);
  const [importMode, setImportMode] = useState("text"); // 'text' ou 'upload'
  const [pastedText, setPastedText] = useState("");
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [savingPDF, setSavingPDF] = useState(false);

  // Estados para Importação de Pagamentos
  const [paymentsStore, setPaymentsStore] = useState(STORES[0]);
  const [paymentsText, setPaymentsText] = useState("");
  const [parsedPayments, setParsedPayments] = useState([]);
  const [savingPayments, setSavingPayments] = useState(false);

  // Estados para Crediário / Valores Pendentes
  const [recStore, setRecStore] = useState(STORES[0]);
  const [recName, setRecName] = useState("");
  const [recDueDate, setRecDueDate] = useState(getTodayDateString());
  const [recAmount, setRecAmount] = useState("");
  const [recInstallments, setRecInstallments] = useState(1);

  // Estados para Desfazer / Limpeza
  const [undoDate, setUndoDate] = useState(getTodayDateString());
  const [undoStore, setUndoStore] = useState("all");

  useEffect(() => {
    setCategory(CATEGORIES[type][0]);
  }, [type]);

  const handleUndoBulk = () => {
    const toDelete = transactions.filter(
      (t) =>
        t.date === undoDate && (undoStore === "all" || t.store === undoStore)
    );
    if (toDelete.length === 0) {
      showAlert("Nenhum lançamento encontrado para esta data e loja.");
      return;
    }
    showConfirm(
      `Atenção: Você está prestes a apagar TODOS os ${
        toDelete.length
      } lançamentos (Entradas e Saídas) do dia ${new Date(
        undoDate + "T12:00:00"
      ).toLocaleDateString("pt-BR")}. Deseja continuar?`,
      async () => {
        for (const tx of toDelete) {
          await onDelete(tx.id, true);
        }
        showAlert("Lançamentos desfeitos com sucesso!");
      }
    );
  };

  const handleAddRecSubmit = async (e) => {
    e.preventDefault();
    if (!recAmount || isNaN(recAmount) || Number(recAmount) <= 0) {
      showAlert("Por favor, insira um valor válido.");
      return;
    }

    const installments = Number(recInstallments) || 1;
    const totalAmount = Number(recAmount);

    if (installments > 1) {
      const installmentValue = totalAmount / installments;
      const [y, m, d] = recDueDate.split("-");

      for (let i = 0; i < installments; i++) {
        let newM = parseInt(m) - 1 + i;
        let newY = parseInt(y) + Math.floor(newM / 12);
        newM = newM % 12;

        // Criação de data segura garantindo que não pule meses
        let dateObj = new Date(newY, newM, parseInt(d), 12, 0, 0);
        if (dateObj.getDate() !== parseInt(d)) {
          dateObj.setDate(0);
        }

        const dateStr = dateObj.toISOString().split("T")[0];

        await onAddReceivable(
          {
            store: recStore,
            customerName: `${recName} (${i + 1}/${installments})`,
            dueDate: dateStr,
            amount: installmentValue,
          },
          true
        );
      }
      showAlert(
        `Crediário parcelado em ${installments}x registrado com sucesso!`
      );
    } else {
      await onAddReceivable({
        store: recStore,
        customerName: recName,
        dueDate: recDueDate,
        amount: totalAmount,
      });
    }

    setRecName("");
    setRecAmount("");
    setRecInstallments(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (registroTipo === "avulso") {
      if (!amount || isNaN(amount) || Number(amount) <= 0) {
        showAlert("Por favor, insira um valor válido.");
        return;
      }

      await onAdd({
        store,
        type,
        category,
        amount: Number(amount),
        date,
        description,
        bankAccount: type === "saida" ? bankAccount : null,
      });

      setAmount("");
      setDescription("");
      setBankAccount("");
    } else {
      const txs = [];
      if (Number(vendaTotal) > 0)
        txs.push({
          store,
          type: "entrada",
          category: "Vendas",
          amount: Number(vendaTotal),
          date,
          description: "Fechamento Manual - Venda Total",
        });
      if (Number(custoTotal) > 0)
        txs.push({
          store,
          type: "saida",
          category: "Custo de Mercadorias",
          amount: Number(custoTotal),
          date,
          description: "Fechamento Manual - Custo Produtos",
        });
      if (Number(descontoTotal) > 0)
        txs.push({
          store,
          type: "saida",
          category: "Descontos",
          amount: Number(descontoTotal),
          date,
          description: "Fechamento Manual - Descontos Concedidos",
        });
      if (Number(despesaTotal) > 0)
        txs.push({
          store,
          type: "saida",
          category: "Taxas/Impostos/Retirada",
          amount: Number(despesaTotal),
          date,
          description: "Fechamento Manual - Despesas",
        });
      if (Number(adicionalTotal) > 0)
        txs.push({
          store,
          type: "saida",
          category: "Adicionais",
          amount: Number(adicionalTotal),
          date,
          description: "Fechamento Manual - Adicionais",
        });

      if (txs.length === 0) {
        showAlert(
          "Preencha pelo menos um valor maior que zero para salvar o fechamento."
        );
        return;
      }

      for (const tx of txs) {
        await onAdd(tx);
      }

      setVendaTotal("");
      setCustoTotal("");
      setDescontoTotal("");
      setDespesaTotal("");
      setAdicionalTotal("");
    }
  };

  const extractDataFromText = (fullText) => {
    // --- PROTEÇÃO CONTRA COLAGEM ERRADA ---
    if (
      /(?:Pago|Pendente):\s*R\$/i.test(fullText) &&
      !/Venda Total:/i.test(fullText)
    ) {
      showAlert(
        "⚠️ ATENÇÃO: Você colou o resumo de PAGAMENTOS no campo de FECHAMENTO.\n\nPor favor, cole os dados do Balanço (Venda Total, Custo Total, etc) neste local."
      );
      return;
    }

    const parseValue = (str) => {
      if (!str) return 0;
      return parseFloat(str.replace(/\./g, "").replace(",", "."));
    };

    const dateMatch =
      fullText.match(/(?:Data|Período|Inicial).*?(\d{2}\/\d{2}\/\d{4})/i) ||
      fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
    const vendaMatch = fullText.match(/Venda Total:\s*R\$\s*([\d.,]+)/i);
    const adicionalMatch = fullText.match(
      /Adicional Total:\s*R\$\s*([\d.,]+)/i
    );
    const custoMatch = fullText.match(/Custo Total:\s*R\$\s*([\d.,]+)/i);
    const descontoMatch = fullText.match(/Desconto Total:\s*R\$\s*([\d.,]+)/i);
    const despesaMatch = fullText.match(/Despesa Total:\s*R\$\s*([\d.,]+)/i);

    let txDate = getTodayDateString();
    if (dateMatch) {
      const [dd, mm, yyyy] = dateMatch[1].split("/");
      txDate = `${yyyy}-${mm}-${dd}`;
    }

    const newTxs = [];

    if (vendaMatch && parseValue(vendaMatch[1]) > 0) {
      newTxs.push({
        store: pdfStore,
        type: "entrada",
        category: "Vendas",
        amount: parseValue(vendaMatch[1]),
        date: txDate,
        description: "Fechamento - Venda Total",
      });
    }
    if (custoMatch && parseValue(custoMatch[1]) > 0) {
      newTxs.push({
        store: pdfStore,
        type: "saida",
        category: "Custo de Mercadorias",
        amount: parseValue(custoMatch[1]),
        date: txDate,
        description: "Fechamento - Custo Produtos",
      });
    }
    if (descontoMatch && parseValue(descontoMatch[1]) > 0) {
      newTxs.push({
        store: pdfStore,
        type: "saida",
        category: "Descontos",
        amount: parseValue(descontoMatch[1]),
        date: txDate,
        description: "Fechamento - Descontos Concedidos",
      });
    }
    if (despesaMatch && parseValue(despesaMatch[1]) > 0) {
      newTxs.push({
        store: pdfStore,
        type: "saida",
        category: "Taxas/Impostos/Retirada",
        amount: parseValue(despesaMatch[1]),
        date: txDate,
        description: "Fechamento - Despesas",
      });
    }
    if (adicionalMatch && parseValue(adicionalMatch[1]) > 0) {
      newTxs.push({
        store: pdfStore,
        type: "saida",
        category: "Adicionais",
        amount: parseValue(adicionalMatch[1]),
        date: txDate,
        description: "Fechamento - Adicionais",
      });
    }

    if (newTxs.length === 0) {
      showAlert(
        "Não foi possível encontrar os valores esperados. Verifique se o formato do texto está correto."
      );
    } else {
      setParsedTransactions(newTxs);
      setPastedText("");
    }
  };

  const extractPaymentsFromText = (text) => {
    // --- PROTEÇÃO CONTRA COLAGEM ERRADA ---
    if (
      /(?:Venda Total|Custo Total):\s*R\$/i.test(text) &&
      !/(?:Pago|Pendente):\s*R\$/i.test(text)
    ) {
      showAlert(
        "⚠️ ATENÇÃO: Você colou os dados de FECHAMENTO no campo de PAGAMENTOS.\n\nPor favor, cole a listagem dos métodos de pagamento (Cartão, Dinheiro, etc) neste local."
      );
      return;
    }

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    let txDate = getTodayDateString();

    // Procura por qualquer data globalmente no texto colado
    const globalDateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (globalDateMatch) {
      const [dd, mm, yyyy] = globalDateMatch[1].split("/");
      txDate = `${yyyy}-${mm}-${dd}`;
    }

    const newTxs = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const dateMatch = line.match(
        /(?:Data\s*:|^\s*Data).*?(\d{2}\/\d{2}\/\d{4})/i
      );
      if (dateMatch) {
        const [dd, mm, yyyy] = dateMatch[1].split("/");
        txDate = `${yyyy}-${mm}-${dd}`;
        continue;
      }

      if (/^(Pago|Pendente|Total)/i.test(line)) continue;

      if (i < lines.length - 1 && /^R\$\s*[\d.,]+$/.test(lines[i + 1])) {
        const method = line;
        const valStr = lines[i + 1].replace(/[^\d,.-]/g, "");
        const valAmount = parseFloat(
          valStr.replace(/\./g, "").replace(",", ".")
        );

        if (valAmount > 0) {
          newTxs.push({
            store: paymentsStore,
            type: "entrada",
            category: "Meios de Pagamento",
            amount: valAmount,
            date: txDate,
            description: `Pagamento - ${method}`,
          });
        }
        i++;
      } else {
        const inlineMatch = line.match(/(.*?)\s+R\$\s*([\d.,]+)$/i);
        if (inlineMatch && !/^(Pago|Pendente|Total)/i.test(inlineMatch[1])) {
          const method = inlineMatch[1].trim();
          const valStr = inlineMatch[2];
          const valAmount = parseFloat(
            valStr.replace(/\./g, "").replace(",", ".")
          );

          if (valAmount > 0) {
            newTxs.push({
              store: paymentsStore,
              type: "entrada",
              category: "Meios de Pagamento",
              amount: valAmount,
              date: txDate,
              description: `Pagamento - ${method}`,
            });
          }
        }
      }
    }

    if (newTxs.length === 0) {
      showAlert(
        "Não foi possível identificar os pagamentos no texto colado. Verifique o formato."
      );
    } else {
      setParsedPayments(newTxs);
      setPaymentsText("");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      showAlert("Por favor, selecione um arquivo PDF.");
      return;
    }

    if (!window.pdfjsLib) {
      showAlert(
        "A biblioteca de leitura de PDF ainda está carregando. Tente novamente em alguns segundos."
      );
      return;
    }

    setIsParsingPDF(true);
    setParsedTransactions([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
        .promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + " ";
      }

      extractDataFromText(fullText);
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      showAlert("Ocorreu um erro ao ler o arquivo PDF.");
    } finally {
      setIsParsingPDF(false);
      e.target.value = null;
    }
  };

  const handleConfirmPDF = async () => {
    setSavingPDF(true);
    for (const tx of parsedTransactions) {
      await onAdd(tx);
    }
    setParsedTransactions([]);
    setSavingPDF(false);
  };

  const handleConfirmPayments = async () => {
    setSavingPayments(true);
    for (const tx of parsedPayments) {
      await onAdd(tx);
    }
    setParsedPayments([]);
    setSavingPayments(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">
          Lançamento de Caixa
        </h2>
        <p className="text-slate-500">
          Registre as movimentações diárias das suas lojas manualmente ou via
          PDF.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* CARD: IMPORTAÇÃO DE PDF (FECHAMENTO) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileText size={100} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center relative z-10">
              <Upload size={20} className="mr-2 text-blue-500" />
              Importar Fechamento
            </h3>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loja (Para o PDF)
                </label>
                <select
                  value={pdfStore}
                  onChange={(e) => setPdfStore(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  {STORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {parsedTransactions.length === 0 ? (
                <div>
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => setImportMode("text")}
                      className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                        importMode === "text"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Clipboard size={16} className="mr-2" /> Colar Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("upload")}
                      className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                        importMode === "upload"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Upload size={16} className="mr-2" /> Arquivo
                    </button>
                  </div>

                  {importMode === "upload" ? (
                    <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                      {isParsingPDF ? (
                        <div className="flex flex-col items-center text-blue-500">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-sm font-medium">
                            Lendo PDF...
                          </span>
                        </div>
                      ) : (
                        <>
                          <FileText size={32} className="text-slate-400 mb-2" />
                          <span className="text-sm font-medium text-slate-600">
                            Clique para enviar o PDF
                          </span>
                          <span className="text-xs text-slate-400 mt-1 text-center">
                            Extração automática de valores
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isParsingPDF}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Copie o texto do balanço e cole aqui..."
                        className="w-full h-32 rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!pastedText.trim()) return;
                          extractDataFromText(pastedText);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-blue-600 font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center text-sm"
                      >
                        Processar Texto Colado
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-blue-800 text-sm">
                      Dados Encontrados:
                    </span>
                    <button
                      onClick={() => setParsedTransactions([])}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                    {parsedTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs items-center bg-white p-2 rounded border border-blue-100 shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span
                            className="text-slate-600 truncate font-medium"
                            title={tx.category}
                          >
                            {tx.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(tx.date + "T12:00:00").toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                        <span
                          className={`font-bold whitespace-nowrap ${
                            tx.type === "entrada"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {tx.type === "entrada" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleConfirmPDF}
                    disabled={savingPDF}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center text-sm"
                  >
                    {savingPDF ? (
                      "Salvando..."
                    ) : (
                      <>
                        <CheckCircle size={18} className="mr-2" /> Confirmar e
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD: IMPORTAÇÃO DE PAGAMENTOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <CreditCard size={100} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center relative z-10">
              <Clipboard size={20} className="mr-2 text-emerald-500" />
              Importar Pagamentos
            </h3>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loja (Para os Pagamentos)
                </label>
                <select
                  value={paymentsStore}
                  onChange={(e) => setPaymentsStore(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  {STORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {parsedPayments.length === 0 ? (
                <div className="space-y-3">
                  <textarea
                    value={paymentsText}
                    onChange={(e) => setPaymentsText(e.target.value)}
                    placeholder="Cole aqui o resumo de métodos de pagamentos..."
                    className="w-full h-32 rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!paymentsText.trim()) return;
                      extractPaymentsFromText(paymentsText);
                    }}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center text-sm"
                  >
                    Processar Pagamentos
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-emerald-800 text-sm">
                      Métodos Encontrados:
                    </span>
                    <button
                      onClick={() => setParsedPayments([])}
                      className="text-emerald-500 hover:text-emerald-700"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                    {parsedPayments.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs items-center bg-white p-2 rounded border border-emerald-100 shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span
                            className="text-slate-600 truncate font-medium"
                            title={tx.description}
                          >
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(tx.date + "T12:00:00").toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                        <span className="font-bold whitespace-nowrap text-emerald-600">
                          +{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleConfirmPayments}
                    disabled={savingPayments}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center text-sm"
                  >
                    {savingPayments ? (
                      "Salvando..."
                    ) : (
                      <>
                        <CheckCircle size={18} className="mr-2" /> Confirmar e
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD: CREDIÁRIO / VALORES PENDENTES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center relative z-10">
              <Users size={20} className="mr-2 text-indigo-500" />
              Valores Pendentes (Crediário)
            </h3>

            <form
              onSubmit={handleAddRecSubmit}
              className="space-y-4 relative z-10"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loja
                </label>
                <select
                  value={recStore}
                  onChange={(e) => setRecStore(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  {STORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={recDueDate}
                  onChange={(e) => setRecDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Parcelas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={recInstallments}
                    onChange={(e) => setRecInstallments(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 rounded-lg transition-colors flex justify-center items-center"
              >
                <PlusCircle size={20} className="mr-2" />
                Cadastrar Pendência
              </button>
            </form>
          </div>

          {/* CARD: REGISTRO MANUAL */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <PlusCircle size={20} className="mr-2 text-amber-500" />
              Registro Manual
            </h3>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setRegistroTipo("fechamento")}
                className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  registroTipo === "fechamento"
                    ? "bg-white shadow-sm text-amber-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Fechamento Completo
              </button>
              <button
                type="button"
                onClick={() => setRegistroTipo("avulso")}
                className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                  registroTipo === "avulso"
                    ? "bg-white shadow-sm text-amber-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Lançamento Avulso
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Loja
                  </label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  >
                    {STORES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Lançamento
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {registroTipo === "fechamento" ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Dados do Balanço
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Venda Total
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-emerald-500 font-bold">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={vendaTotal}
                        onChange={(e) => setVendaTotal(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 pl-10 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custo Total
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-rose-400 text-xs font-bold">
                            R$
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={custoTotal}
                          onChange={(e) => setCustoTotal(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 pl-7 p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Desconto Total
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-rose-400 text-xs font-bold">
                            R$
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={descontoTotal}
                          onChange={(e) => setDescontoTotal(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 pl-7 p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Despesa Total
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-rose-400 text-xs font-bold">
                            R$
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={despesaTotal}
                          onChange={(e) => setDespesaTotal(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 pl-7 p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Adicional Total
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-rose-400 text-xs font-bold">
                            R$
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={adicionalTotal}
                          onChange={(e) => setAdicionalTotal(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 pl-7 p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <label
                      className={`flex-1 flex justify-center items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        type === "entrada"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="type"
                        checked={type === "entrada"}
                        onChange={() => setType("entrada")}
                      />
                      <TrendingUp size={18} className="mr-2" /> Entrada
                    </label>
                    <label
                      className={`flex-1 flex justify-center items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        type === "saida"
                          ? "bg-rose-50 border-rose-500 text-rose-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="type"
                        checked={type === "saida"}
                        onChange={() => setType("saida")}
                      />
                      <TrendingDown size={18} className="mr-2" /> Saída
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    >
                      {CATEGORIES[type].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {type === "saida" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Conta de Origem (Opcional)
                      </label>
                      <select
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      >
                        <option value="">Selecione a conta...</option>
                        {ALL_ACCOUNTS.filter(
                          (a) => a.store === store || a.store === "all"
                        ).map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Valor (R$)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 pl-10 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Descrição (Opcional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Venda cliente VIP..."
                      className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold py-3 rounded-lg transition-colors flex justify-center items-center"
              >
                <PlusCircle size={20} className="mr-2" />
                Salvar Lançamento
              </button>
            </form>
          </div>

          {/* CARD: DESFAZER LANÇAMENTOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6 mt-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center">
              <RotateCcw size={20} className="mr-2 text-rose-500" />
              Desfazer / Limpar Dia
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Errou na importação? Selecione o dia e a loja para excluir todos
              os lançamentos (Fechamentos e Pagamentos) dessa data.
            </p>
            <div className="flex flex-col space-y-3">
              <div className="flex space-x-3">
                <input
                  type="date"
                  value={undoDate}
                  onChange={(e) => setUndoDate(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                />
                <select
                  value={undoStore}
                  onChange={(e) => setUndoStore(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="all">Todas as Lojas</option>
                  {STORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleUndoBulk}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2 rounded-lg transition-colors text-sm"
              >
                Apagar Tudo deste Dia
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RECENT TRANSACTIONS */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <List size={20} className="mr-2 text-slate-500" />
              Últimos Lançamentos
            </h3>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {transactions.length} registros
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 max-h-[750px] space-y-3">
            {transactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p>Nenhum lançamento encontrado.</p>
                <p className="text-sm">
                  Os registros que você adicionar aparecerão aqui.
                </p>
              </div>
            ) : (
              transactions.slice(0, 50).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-3 rounded-full ${
                        t.type === "entrada"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-rose-100 text-rose-600"
                      }`}
                    >
                      {t.type === "entrada" ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {t.category}
                      </p>
                      <div className="flex items-center text-xs text-slate-500 space-x-2 mt-1">
                        <span className="flex items-center">
                          <Store size={12} className="mr-1" /> {t.store}
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1" />{" "}
                          {new Date(t.date + "T12:00:00").toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                        {t.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">
                              {t.description}
                            </span>
                          </>
                        )}
                        {t.bankAccount && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-indigo-600 font-medium">
                              <Landmark size={12} className="mr-1" />{" "}
                              {t.bankAccount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`font-bold ${
                        t.type === "entrada"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {t.type === "entrada" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  transactions,
  payables,
  receivables,
  bankBalances,
  onUpdateBalance,
  store,
  title,
}) {
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());

  const { calcCentro, calcArena } = useMemo(() => {
    let c = 0,
      a = 0;
    transactions.forEach((t) => {
      let amount = 0;
      // OTIMIZAÇÃO: includes é 10x mais rápido que o regex (test) para milhares de itens
      const isDinheiro = t.description
        ? t.description.toLowerCase().includes("dinheiro")
        : false;

      if (t.type === "entrada" && isDinheiro) amount = t.amount;
      else if (
        t.type === "saida" &&
        (t.category === "Dinheiro Retirado" || isDinheiro)
      )
        amount = -t.amount;

      if (t.store === "Loja Centro") c += amount;
      if (t.store === "Loja Arena") a += amount;
    });
    return { calcCentro: c, calcArena: a };
  }, [transactions]);

  const baseCentro = bankBalances["dinheiro_base_Loja Centro"] || 0;
  const baseArena = bankBalances["dinheiro_base_Loja Arena"] || 0;
  const totalCentro = calcCentro + baseCentro;
  const totalArena = calcArena + baseArena;

  const dinheiroGuardadoTotal =
    store === "all"
      ? totalCentro + totalArena
      : store === "Loja Centro"
      ? totalCentro
      : totalArena;

  const storePayables = useMemo(() => {
    if (!payables) return [];
    return payables.filter((p) => store === "all" || p.store === store);
  }, [payables, store]);

  const storeReceivables = useMemo(() => {
    if (!receivables) return [];
    return receivables.filter((r) => store === "all" || r.store === store);
  }, [receivables, store]);

  const payablesStats = useMemo(() => {
    const todayStr = getTodayDateString();
    let contasHoje = 0;
    let contasFuturas = 0;
    const periodPayables = [];

    // OTIMIZAÇÃO: Um único loop percorrendo os arrays em vez de 3 filters/reduces separados
    storePayables.forEach((p) => {
      if (p.dueDate <= todayStr) contasHoje += p.amount;
      if (p.dueDate > todayStr) contasFuturas += p.amount;
      if (p.dueDate >= startDate && p.dueDate <= endDate)
        periodPayables.push(p);
    });

    return { hoje: contasHoje, futuras: contasFuturas, periodPayables };
  }, [storePayables, startDate, endDate]);

  const advancedStats = useMemo(() => {
    let totalIncome = 0;
    let totalPaymentsReceived = 0;
    let totalExpensePaid = 0;
    let totalExpensePending = 0;
    let totalDiscounts = 0;
    let salesCount = 0;
    const expensesByCategory = {};
    const paymentsBreakdownMap = {};

    const addToCategory = (cat, amount, type) => {
      if (!expensesByCategory[cat])
        expensesByCategory[cat] = { paid: 0, pending: 0, total: 0 };
      expensesByCategory[cat][type] += amount;
      expensesByCategory[cat].total += amount;
    };

    // OTIMIZAÇÃO: Filtro e processamento unificados (Evita criar vetores clonados enormes na memória)
    transactions.forEach((t) => {
      const storeMatch = store === "all" || t.store === store;
      const dateMatch = t.date >= startDate && t.date <= endDate;

      if (!storeMatch || !dateMatch) return;

      if (t.type === "entrada") {
        if (t.category === "Meios de Pagamento") {
          totalPaymentsReceived += t.amount;
          const method = t.description
            ? t.description.replace("Pagamento - ", "")
            : "Outros";
          paymentsBreakdownMap[method] =
            (paymentsBreakdownMap[method] || 0) + t.amount;
        } else {
          totalIncome += t.amount;
          salesCount++;
        }
      } else {
        if (t.category === "Descontos") {
          totalDiscounts += t.amount;
        } else {
          totalExpensePaid += t.amount;
          addToCategory(t.category, t.amount, "paid");
        }
      }
    });

    payablesStats.periodPayables.forEach((p) => {
      totalExpensePending += p.amount;
      addToCategory(p.category || "Outros", p.amount, "pending");
    });

    const totalExpenseProjected = totalExpensePaid + totalExpensePending;
    const netProfitCurrent = totalIncome - totalExpensePaid;
    const netProfitProjected = totalIncome - totalExpenseProjected;
    const marginProjected =
      totalIncome > 0 ? (netProfitProjected / totalIncome) * 100 : 0;
    const marginCurrent =
      totalIncome > 0 ? (netProfitCurrent / totalIncome) * 100 : 0;
    const averageTicket = salesCount > 0 ? totalIncome / salesCount : 0;
    const costCommitment =
      totalIncome > 0 ? (totalExpenseProjected / totalIncome) * 100 : 0;

    const expenseBreakdown = Object.entries(expensesByCategory)
      .map(([name, vals]) => ({ name, ...vals }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const paymentsBreakdown = Object.entries(paymentsBreakdownMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalIncome,
      totalPaymentsReceived,
      paymentsBreakdown,
      totalExpensePaid,
      totalExpensePending,
      totalExpenseProjected,
      totalDiscounts,
      netProfitCurrent,
      netProfitProjected,
      marginCurrent,
      marginProjected,
      averageTicket,
      costCommitment,
      expenseBreakdown,
    };
  }, [transactions, store, startDate, endDate, payablesStats]);

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const calDate = new Date((startDate || getTodayDateString()) + "T12:00:00");
  const calMonth = calDate.getMonth();
  const calYear = calDate.getFullYear();

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // OTIMIZAÇÃO: Mapa de memória para o Calendário. Reduz operações de 30.000+ para apenas as necessárias.
  const payablesByDate = useMemo(() => {
    const map = {};
    storePayables.forEach((p) => {
      if (!map[p.dueDate]) map[p.dueDate] = [];
      map[p.dueDate].push(p);
    });
    return map;
  }, [storePayables]);

  const receivablesByDate = useMemo(() => {
    const map = {};
    storeReceivables.forEach((r) => {
      if (!map[r.dueDate]) map[r.dueDate] = [];
      map[r.dueDate].push(r);
    });
    return map;
  }, [storeReceivables]);

  // LOGICA DOS BANCOS E CAIXA
  const baseVisibleAccounts = ALL_ACCOUNTS.filter(
    (acc) => store === "all" || acc.store === store || acc.store === "all"
  );

  const visibleAccounts = [];
  if (store === "all" || store === "Loja Centro") {
    visibleAccounts.push({
      id: "dinheiro_Loja Centro",
      name: "Caixa Físico (Dinheiro)",
      store: "Loja Centro",
      isCash: true,
      currentTotal: totalCentro,
      calculatedRaw: calcCentro,
    });
  }
  if (store === "all" || store === "Loja Arena") {
    visibleAccounts.push({
      id: "dinheiro_Loja Arena",
      name: "Caixa Físico (Dinheiro)",
      store: "Loja Arena",
      isCash: true,
      currentTotal: totalArena,
      calculatedRaw: calcArena,
    });
  }
  visibleAccounts.push(...baseVisibleAccounts);

  const totalBancos = visibleAccounts.reduce((acc, account) => {
    if (account.isCash) return acc + account.currentTotal;
    return acc + (bankBalances[account.id] || 0);
  }, 0);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <header>
          <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500">
            Resumo financeiro e análise de saúde do negócio.
          </p>
        </header>

        <div className="flex flex-wrap items-center space-x-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold px-2 uppercase tracking-wider hidden sm:block">
            Período:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent font-medium text-slate-700 outline-none text-sm p-1 rounded hover:bg-slate-50 cursor-pointer border-none focus:ring-0"
          />
          <span className="text-slate-300 font-medium">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent font-medium text-slate-700 outline-none text-sm p-1 rounded hover:bg-slate-50 cursor-pointer border-none focus:ring-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Faturamento (Entradas)"
          value={formatCurrency(advancedStats.totalIncome)}
          icon={<TrendingUp size={24} className="text-emerald-500" />}
          colorClass="bg-emerald-500"
        />
        <StatCard
          title="Despesas Pagas"
          value={formatCurrency(advancedStats.totalExpensePaid)}
          icon={<TrendingDown size={24} className="text-rose-500" />}
        />
        <StatCard
          title="Contas Pendentes (Mês)"
          value={formatCurrency(advancedStats.totalExpensePending)}
          icon={<Receipt size={24} className="text-orange-500" />}
        />
        <StatCard
          title="Despesa Total Projetada"
          value={formatCurrency(advancedStats.totalExpenseProjected)}
          icon={<AlertCircle size={24} className="text-rose-600" />}
          trend="negative"
        />

        <StatCard
          title="Lucro Atual (Em Caixa)"
          value={formatCurrency(advancedStats.netProfitCurrent)}
          icon={<Wallet size={24} className="text-blue-500" />}
        />
        <StatCard
          title="Lucro Real Projetado"
          value={formatCurrency(advancedStats.netProfitProjected)}
          icon={<DollarSign size={24} className="text-amber-500" />}
          highlight={true}
          trend={
            advancedStats.netProfitProjected >= 0 ? "positive" : "negative"
          }
        />
        <StatCard
          title="Margem Projetada"
          value={`${advancedStats.marginProjected.toFixed(1)}%`}
          icon={<PieChart size={24} className="text-indigo-500" />}
          trend={
            advancedStats.marginProjected >= 15
              ? "positive"
              : advancedStats.marginProjected > 0
              ? "neutral"
              : "negative"
          }
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(advancedStats.averageTicket)}
          icon={<PlusCircle size={24} className="text-emerald-400" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center">
              <AlertCircle size={16} className="mr-1 text-rose-500" />
              Contas a Pagar Hoje (ou Atrasadas)
            </p>
            <h3 className="text-2xl font-bold text-rose-600">
              {formatCurrency(payablesStats.hoje)}
            </h3>
          </div>
          <div className="p-3 bg-rose-50 rounded-full text-rose-500">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center">
              <CalendarDays size={16} className="mr-1 text-blue-500" />
              Contas a Pagar Futuras
            </p>
            <h3 className="text-2xl font-bold text-blue-600">
              {formatCurrency(payablesStats.futuras)}
            </h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-500">
            <Receipt size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between">
          <div>
            <p
              className="text-sm font-medium text-slate-500 mb-1 flex items-center"
              title="Saldo acumulado de entradas e saídas em espécie"
            >
              <DollarSign size={16} className="mr-1 text-emerald-500" />
              Dinheiro Guardado
            </p>
            <h3 className="text-2xl font-bold text-emerald-600">
              {formatCurrency(dinheiroGuardadoTotal)}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-500">
            <Wallet size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 flex items-center justify-between">
          <div>
            <p
              className="text-sm font-medium text-slate-500 mb-1 flex items-center"
              title="Soma dos descontos dados aos clientes (Não deduzido do lucro)"
            >
              <TrendingDown size={16} className="mr-1 text-purple-500" />
              Descontos Concedidos
            </p>
            <h3 className="text-2xl font-bold text-purple-600">
              {formatCurrency(advancedStats.totalDiscounts)}
            </h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-full text-purple-500">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* NOVA ÁREA: SALDOS BANCÁRIOS E CAIXA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-4 flex justify-between items-center">
            <div className="flex items-center">
              <Landmark size={20} className="mr-2 text-indigo-500" /> Saldos em
              Contas e Caixa
            </div>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm">
              Total: {formatCurrency(totalBancos)}
            </span>
          </h3>
          <div className="space-y-3">
            {visibleAccounts.map((acc) => {
              if (acc.isCash) {
                return (
                  <BankAccountRow
                    key={acc.id}
                    account={acc}
                    balance={acc.currentTotal}
                    onUpdate={(newTotal) => {
                      const adjustment = newTotal - acc.calculatedRaw;
                      onUpdateBalance(`dinheiro_base_${acc.store}`, adjustment);
                    }}
                  />
                );
              }
              return (
                <BankAccountRow
                  key={acc.id}
                  account={acc}
                  balance={bankBalances[acc.id] || 0}
                  onUpdate={(val) => onUpdateBalance(acc.id, val)}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            *Atualize os valores manualmente clicando no ícone do lápis. Eles
            não interferem no lucro do mês.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-4 flex justify-between items-center">
            Detalhamento de Despesas
            <div className="flex text-xs space-x-3 font-normal">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-rose-500 rounded-full mr-1"></div>{" "}
                Pagas
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-amber-400 rounded-full mr-1"></div>{" "}
                Pendentes
              </span>
            </div>
          </h3>

          {advancedStats.expenseBreakdown.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              Nenhuma despesa ou conta registrada neste período.
            </div>
          ) : (
            <div className="space-y-6">
              {advancedStats.expenseBreakdown.map((item, index) => {
                const totalRef = advancedStats.totalExpenseProjected;
                const paidPercentage =
                  totalRef > 0 ? (item.paid / totalRef) * 100 : 0;
                const pendingPercentage =
                  totalRef > 0 ? (item.pending / totalRef) * 100 : 0;
                const totalItemPercentage =
                  totalRef > 0 ? (item.total / totalRef) * 100 : 0;

                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700">
                        {item.name}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {formatCurrency(item.total)}{" "}
                        <span className="text-xs text-slate-400">
                          ({totalItemPercentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${paidPercentage}%` }}
                        title={`Pago: ${formatCurrency(item.paid)}`}
                      ></div>
                      <div
                        className="bg-amber-400 h-full transition-all"
                        style={{ width: `${pendingPercentage}%` }}
                        title={`Pendente: ${formatCurrency(item.pending)}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONFERÊNCIA DE PAGAMENTOS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b pb-4 flex justify-between items-center">
            Conferência de Caixa (Meios de Pagto)
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full ${
                advancedStats.totalIncome ===
                advancedStats.totalPaymentsReceived
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              Diferença:{" "}
              {formatCurrency(
                Math.abs(
                  advancedStats.totalIncome -
                    advancedStats.totalPaymentsReceived
                )
              )}
            </span>
          </h3>

          <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-center flex-1 border-r border-slate-200">
              <p className="text-xs text-slate-500 uppercase font-semibold">
                Balanço (Vendas)
              </p>
              <p className="text-lg font-bold text-slate-800">
                {formatCurrency(advancedStats.totalIncome)}
              </p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500 uppercase font-semibold">
                Soma dos Pagamentos
              </p>
              <p
                className={`text-lg font-bold ${
                  advancedStats.totalIncome ===
                  advancedStats.totalPaymentsReceived
                    ? "text-emerald-600"
                    : "text-orange-600"
                }`}
              >
                {formatCurrency(advancedStats.totalPaymentsReceived)}
              </p>
            </div>
          </div>

          {advancedStats.paymentsBreakdown.length === 0 ? (
            <div className="text-center text-slate-400 py-6">
              Nenhum pagamento importado neste período.
            </div>
          ) : (
            <div className="space-y-4">
              {advancedStats.paymentsBreakdown.map((item, index) => {
                const percentage =
                  advancedStats.totalPaymentsReceived > 0
                    ? (item.value / advancedStats.totalPaymentsReceived) * 100
                    : 0;
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">
                        {item.name}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {formatCurrency(item.value)}{" "}
                        <span className="text-xs text-slate-400">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Building2 size={150} />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-amber-500 mb-2">
                Raio-X da Saúde Financeira
              </h3>
              <p className="text-slate-400 mb-6 text-sm">
                Análise inteligente baseada no lucro projetado e no
                comprometimento de receita do mês.
              </p>

              <div className="text-center mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                {advancedStats.totalIncome === 0 ? (
                  <div className="flex items-center flex-col">
                    <AlertCircle size={32} className="text-slate-500 mb-2" />
                    <h4 className="text-lg font-bold text-white">
                      Sem Dados Suficientes
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Registre vendas para ativar a análise.
                    </p>
                  </div>
                ) : advancedStats.marginProjected >= 20 ? (
                  <div className="flex items-center flex-col">
                    <TrendingUp size={32} className="text-emerald-400 mb-2" />
                    <h4 className="text-lg font-bold text-emerald-400">
                      Excelente! (Lucro Alto)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Sua operação gera caixa com muita folga após pagar todas
                      as contas.
                    </p>
                  </div>
                ) : advancedStats.marginProjected >= 5 ? (
                  <div className="flex items-center flex-col">
                    <TrendingUp size={32} className="text-amber-400 mb-2" />
                    <h4 className="text-lg font-bold text-amber-400">
                      Saudável (Lucro Estável)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      As receitas cobrem as despesas e deixam uma margem segura.
                    </p>
                  </div>
                ) : advancedStats.marginProjected > 0 ? (
                  <div className="flex items-center flex-col">
                    <TrendingDown size={32} className="text-orange-400 mb-2" />
                    <h4 className="text-lg font-bold text-orange-400">
                      Atenção (Margem Apertada)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      O lucro final será baixo. Risco de faltar dinheiro para
                      imprevistos.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center flex-col">
                    <AlertCircle size={32} className="text-rose-400 mb-2" />
                    <h4 className="text-lg font-bold text-rose-400">
                      Crítico (Prejuízo)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      As despesas pagas e pendentes do mês superam as vendas.
                      Risco no caixa!
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-slate-400 text-sm">
                    Comprometimento de Caixa
                  </span>
                  <span
                    className={`font-bold ${
                      advancedStats.costCommitment > 100
                        ? "text-rose-400"
                        : advancedStats.costCommitment > 80
                        ? "text-orange-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {advancedStats.costCommitment.toFixed(1)}% das Entradas
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-slate-400 text-sm">
                    Contas Atrasadas (Hoje)
                  </span>
                  <span
                    className={`font-bold ${
                      payablesStats.hoje > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {formatCurrency(payablesStats.hoje)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">
                    Cenário Fim de Mês
                  </span>
                  <span
                    className={`font-bold ${
                      advancedStats.netProfitProjected > 0
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {advancedStats.netProfitProjected > 0
                      ? "Lucrativo"
                      : "Déficit"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <CalendarDays size={20} className="mr-2 text-blue-500" />
              Vencimentos ({months[calMonth]} de {calYear})
            </h3>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-2">
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="p-2"></div>
              ))}
              {days.map((d) => {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(
                  2,
                  "0"
                )}-${String(d).padStart(2, "0")}`;

                // OTIMIZAÇÃO: Busca direta no mapa de memória O(1) em vez de array.filter()
                const dayPayables = payablesByDate[dateStr] || [];
                const dayReceivables = receivablesByDate[dateStr] || [];

                const hasPayables = dayPayables.length > 0;
                const hasReceivables = dayReceivables.length > 0;
                const isToday = dateStr === getTodayDateString();

                const totalDayPayables = dayPayables.reduce(
                  (acc, p) => acc + p.amount,
                  0
                );
                const totalDayReceivables = dayReceivables.reduce(
                  (acc, r) => acc + r.amount,
                  0
                );

                const tooltipParts = [];
                if (hasReceivables)
                  tooltipParts.push(
                    `A Receber: ${formatCurrency(totalDayReceivables)}`
                  );
                if (hasPayables)
                  tooltipParts.push(
                    `A Pagar: ${formatCurrency(totalDayPayables)}`
                  );

                return (
                  <div
                    key={d}
                    className={`relative p-2 rounded-lg border ${
                      isToday
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-100 hover:bg-slate-50"
                    } flex flex-col items-center justify-center min-h-[40px] cursor-default`}
                    title={tooltipParts.join("\n")}
                  >
                    <span
                      className={`text-sm ${
                        isToday ? "font-bold text-amber-600" : "text-slate-700"
                      }`}
                    >
                      {d}
                    </span>
                    {(hasPayables || hasReceivables) && (
                      <div className="absolute bottom-1 flex space-x-0.5">
                        {hasReceivables && (
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        )}
                        {hasPayables && (
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-slate-500 flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>{" "}
                A Receber
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-rose-500 rounded-full mr-1"></div> A
                Pagar
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 border border-amber-500 bg-amber-50 rounded mr-1"></div>{" "}
                Hoje
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankAccountRow({ account, balance, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(balance);

  const handleSave = () => {
    onUpdate(Number(tempValue));
    setIsEditing(false);
  };

  return (
    <div className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <p className="font-bold text-slate-700 text-sm">{account.name}</p>
          {account.store !== "all" ? (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
              {account.store}
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
              Ambas Lojas
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">Atualização manual</p>
      </div>
      {isEditing ? (
        <div className="flex items-center space-x-2">
          <input
            type="number"
            step="0.01"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-24 text-right rounded border border-slate-300 p-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button
            onClick={handleSave}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <Save size={16} />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setTempValue(balance);
            }}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <span className="font-bold text-slate-800">
            {formatCurrency(balance)}
          </span>
          <button
            onClick={() => {
              setTempValue(balance);
              setIsEditing(true);
            }}
            className="text-slate-300 hover:text-indigo-500 p-1"
          >
            <Edit2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, trend, highlight = false }) {
  return (
    <div
      className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden ${
        highlight
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-white border-slate-200"
      }`}
    >
      {highlight && (
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
      )}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p
            className={`text-sm font-medium mb-1 ${
              highlight ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {title}
          </p>
          <h3
            className={`text-2xl font-bold tracking-tight ${
              highlight
                ? trend === "negative"
                  ? "text-rose-400"
                  : "text-amber-500"
                : "text-slate-900"
            }`}
          >
            {value}
          </h3>
        </div>
        <div
          className={`p-3 rounded-xl ${
            highlight ? "bg-slate-800" : "bg-slate-50"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function PayablesEntry({
  onAdd,
  payables,
  onDelete,
  onEdit,
  onPay,
  showAlert,
  showConfirm,
}) {
  const [store, setStore] = useState(STORES[0]);
  const [category, setCategory] = useState(CATEGORIES.contas[0]);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [description, setDescription] = useState("");
  const [recurring, setRecurring] = useState(1);

  const [importMode, setImportMode] = useState("upload");
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBill, setParsedBill] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (payable) => {
    setEditingId(payable.id);
    setEditData({ ...payable });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (
      !editData.amount ||
      isNaN(editData.amount) ||
      Number(editData.amount) <= 0
    ) {
      showAlert("Por favor, insira um valor válido.");
      return;
    }
    await onEdit(editingId, editData);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showAlert("Por favor, insira um valor válido.");
      return;
    }

    const monthsToRepeat = Number(recurring) || 1;
    const baseAmount = Number(amount);
    const [y, m, d] = dueDate.split("-");

    for (let i = 0; i < monthsToRepeat; i++) {
      let newM = parseInt(m) - 1 + i;
      let newY = parseInt(y) + Math.floor(newM / 12);
      newM = newM % 12;

      // Ajuste seguro de data para não pular meses
      let dateObj = new Date(newY, newM, parseInt(d), 12, 0, 0);
      if (dateObj.getDate() !== parseInt(d)) {
        dateObj.setDate(0);
      }

      const dateStr = dateObj.toISOString().split("T")[0];
      let finalDesc = description;
      if (monthsToRepeat > 1) {
        finalDesc = `${description} (${i + 1}/${monthsToRepeat})`;
      }

      await onAdd({
        store,
        category,
        amount: baseAmount,
        dueDate: dateStr,
        description: finalDesc,
      });
    }

    showAlert(`Conta(s) agendada(s) com sucesso!`);

    setAmount("");
    setDescription("");
    setRecurring(1);
  };

  const extractBoletoData = (fullText) => {
    const dateRegex =
      /(?:vencimento|pagar at[eé]|venc)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i;
    const fallbackDateRegex = /(\d{2}\/\d{2}\/\d{4})/;

    const valRegex =
      /(?:valor do documento|valor cobrado|total a pagar|valor total|valor)\s*:?\s*(?:R\$)?\s*([\d.,]+)/i;
    const fallbackValRegex = /R\$\s*([\d.,]+)/;

    const benRegex =
      /(?:Benefici[aá]rio|Recebedor)\s*:?\s*([A-Za-zÀ-ÿ0-9\s\.\-\&]{3,50}?)(?:\s{2,}|CNPJ|CPF|Ag[êe]ncia|Data|Vencimento|-|$)/i;

    let dateMatch = fullText.match(dateRegex);
    if (!dateMatch) dateMatch = fullText.match(fallbackDateRegex);

    let valMatch = fullText.match(valRegex);
    if (!valMatch) valMatch = fullText.match(fallbackValRegex);

    let benMatch = fullText.match(benRegex);

    let extractedDate = getTodayDateString();
    let extractedAmount = 0;
    let extractedBeneficiario = "";

    if (dateMatch) {
      const [dd, mm, yyyy] = dateMatch[1].split("/");
      extractedDate = `${yyyy}-${mm}-${dd}`;
    }

    if (valMatch) {
      extractedAmount = parseFloat(
        valMatch[1].replace(/\./g, "").replace(",", ".")
      );
    }

    if (benMatch && benMatch[1]) {
      extractedBeneficiario = benMatch[1].trim();
    }

    if (extractedAmount > 0 || dateMatch) {
      setParsedBill({
        amount: extractedAmount,
        dueDate: extractedDate,
        description: extractedBeneficiario,
      });
    } else {
      showAlert(
        "Não foi possível identificar dados padrão no texto fornecido. Você pode preencher manualmente ao lado."
      );
    }
    setPastedText("");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      showAlert("Por favor, selecione um arquivo PDF.");
      return;
    }

    if (!window.pdfjsLib) {
      showAlert("A biblioteca de leitura de PDF ainda está carregando...");
      return;
    }

    setIsParsing(true);
    setParsedBill(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
        .promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + " ";
      }

      extractBoletoData(fullText);
    } catch (error) {
      console.error("Erro ao processar Boleto:", error);
      showAlert("Ocorreu um erro ao ler o arquivo PDF do boleto.");
    } finally {
      setIsParsing(false);
      e.target.value = null;
    }
  };

  const handleConfirmBill = () => {
    if (parsedBill) {
      setAmount(parsedBill.amount || "");
      setDueDate(parsedBill.dueDate || getTodayDateString());
      if (parsedBill.description) {
        setDescription(parsedBill.description);
      }
      setParsedBill(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Contas a Pagar</h2>
        <p className="text-slate-500">
          Cadastre seus boletos pendentes, importe faturas e nunca atrase um
          pagamento.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center relative z-10">
              <Upload size={20} className="mr-2 text-blue-500" />
              Extrair de Boleto
            </h3>

            <div className="space-y-4 relative z-10">
              {parsedBill ? (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="font-semibold text-blue-800 text-sm mb-2">
                    Dados Localizados:
                  </p>
                  <div className="space-y-1 mb-4 text-sm text-slate-700">
                    <p>
                      <strong>Beneficiário:</strong>{" "}
                      {parsedBill.description || (
                        <span className="text-slate-400 italic">
                          Não identificado
                        </span>
                      )}
                    </p>
                    <p>
                      <strong>Valor:</strong>{" "}
                      {formatCurrency(parsedBill.amount)}
                    </p>
                    <p>
                      <strong>Vencimento:</strong>{" "}
                      {new Date(
                        parsedBill.dueDate + "T12:00:00"
                      ).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setParsedBill(null)}
                      className="flex-1 bg-white text-slate-600 border border-slate-300 py-2 rounded-lg text-sm transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmBill}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold transition-colors hover:bg-blue-700"
                    >
                      Preencher Form
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => setImportMode("upload")}
                      className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                        importMode === "upload"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Upload size={16} className="mr-2" /> PDF Boleto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("text")}
                      className={`flex-1 flex justify-center items-center py-2 text-sm font-medium rounded-md transition-colors ${
                        importMode === "text"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Clipboard size={16} className="mr-2" /> Colar Texto
                    </button>
                  </div>

                  {importMode === "upload" ? (
                    <label className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                      {isParsing ? (
                        <div className="flex flex-col items-center text-blue-500">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        </div>
                      ) : (
                        <>
                          <FileText size={32} className="text-slate-400 mb-2" />
                          <span className="text-sm font-medium text-slate-600">
                            Enviar PDF do Boleto
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isParsing}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Copie e cole aqui os dados do boleto..."
                        className="w-full h-24 rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (pastedText.trim()) extractBoletoData(pastedText);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-blue-600 font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center text-sm"
                      >
                        Extrair Valor e Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <Receipt size={20} className="mr-2 text-amber-500" />
              Nova Conta
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Loja Destino
                </label>
                <select
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {STORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {CATEGORIES.contas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor (R$)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 pl-10 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Repetir (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={recurring}
                    onChange={(e) => setRecurring(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descrição do Título
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fornecedor Bebidas, Aluguel..."
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold py-3 rounded-lg transition-colors flex justify-center items-center"
              >
                <PlusCircle size={20} className="mr-2" /> Agendar Pagamento
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <List size={20} className="mr-2 text-slate-500" />
              Contas Agendadas
            </h3>
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {payables.length} pendentes
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {payables.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                <CheckCircle
                  size={48}
                  className="mb-4 opacity-50 text-emerald-500"
                />
                <p>Tudo em dia!</p>
                <p className="text-sm">
                  Nenhuma conta pendente para as suas lojas.
                </p>
              </div>
            ) : (
              // OTIMIZAÇÃO: Limite na renderização do DOM. Renderiza apenas as 150 primeiras contas agendadas na tela
              payables.slice(0, 150).map((t) => {
                if (editingId === t.id) {
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-indigo-300 bg-indigo-50 transition-colors gap-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-500">
                            Loja
                          </label>
                          <select
                            value={editData.store}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                store: e.target.value,
                              })
                            }
                            className="w-full rounded border border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {STORES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">
                            Categoria
                          </label>
                          <select
                            value={editData.category}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                category: e.target.value,
                              })
                            }
                            className="w-full rounded border border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {CATEGORIES.contas.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">
                            Vencimento
                          </label>
                          <input
                            type="date"
                            value={editData.dueDate}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                dueDate: e.target.value,
                              })
                            }
                            className="w-full rounded border border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-slate-500">
                            Descrição
                          </label>
                          <input
                            type="text"
                            value={editData.description}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                description: e.target.value,
                              })
                            }
                            className="w-full rounded border border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500">
                            Valor (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editData.amount}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                amount: Number(e.target.value),
                              })
                            }
                            className="w-full rounded border border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center"
                        >
                          <Save size={16} className="mr-2" /> Salvar
                        </button>
                      </div>
                    </div>
                  );
                }

                const isOverdue = t.dueDate < getTodayDateString();
                const isToday = t.dueDate === getTodayDateString();

                return (
                  <div
                    key={t.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${
                      isOverdue
                        ? "border-rose-300 bg-rose-50"
                        : isToday
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    } transition-colors gap-4`}
                  >
                    <div className="flex items-start sm:items-center space-x-4">
                      <div
                        className={`p-3 rounded-full hidden sm:block ${
                          isOverdue
                            ? "bg-rose-200 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Receipt size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {t.description || t.category}
                        </p>
                        <div className="flex items-center text-xs space-x-2 mt-1 flex-wrap gap-y-1">
                          <span className="flex items-center text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            <Store size={12} className="mr-1" /> {t.store}
                          </span>
                          <span
                            className={`flex items-center font-medium bg-white px-2 py-0.5 rounded border ${
                              isOverdue
                                ? "border-rose-200 text-rose-600"
                                : isToday
                                ? "border-amber-200 text-amber-600"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            <CalendarDays size={12} className="mr-1" />
                            Vence:{" "}
                            {new Date(
                              t.dueDate + "T12:00:00"
                            ).toLocaleDateString("pt-BR")}
                            {isOverdue && " (Atrasada)"}
                            {isToday && " (Hoje)"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-4 border-t sm:border-0 pt-3 sm:pt-0">
                      <span className="font-bold text-slate-800 text-lg">
                        {formatCurrency(t.amount)}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onPay(t)}
                          title="Dar baixa e enviar para Saídas Diárias"
                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 px-3 py-1.5 rounded-lg flex items-center text-sm font-semibold transition-colors"
                        >
                          <CheckSquare size={16} className="mr-1" /> Pagar
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className="text-slate-400 hover:text-indigo-500 transition-colors p-1.5 border border-slate-200 hover:bg-white rounded-lg"
                          title="Editar Conta"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 border border-slate-200 hover:bg-white rounded-lg"
                          title="Excluir Conta"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({ transactions }) {
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [storeFilter, setStoreFilter] = useState("all");

  const reportData = useMemo(() => {
    // 1. Prepare Base Map for Daily Evolution
    const dateMap = {};
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");

    let curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split("T")[0];
      dateMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
      curr.setDate(curr.getDate() + 1);
      if (Object.keys(dateMap).length > 365) break;
    }

    const catMap = {};
    const payMap = {};
    const storeMap = {};
    const monthlyMap = {};
    const monthlyStoreMap = {}; // Novo mapa para evolução mensal por loja
    STORES.forEach((s) => (storeMap[s] = { income: 0, expense: 0 }));

    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      const inRange = t.date >= startDate && t.date <= endDate;
      const storeMatch = storeFilter === "all" || t.store === storeFilter;

      // Fill Store Map (ignores store filter to compare them)
      if (inRange) {
        if (t.type === "entrada" && t.category !== "Meios de Pagamento") {
          if (storeMap[t.store]) storeMap[t.store].income += t.amount;
        } else if (t.type === "saida" && t.category !== "Descontos") {
          if (storeMap[t.store]) storeMap[t.store].expense += t.amount;
        }
      }

      // Evolução Mensal (Ignora data do filtro, obedece apenas a loja para mostrar o histórico macro)
      if (t.type === "entrada" && t.category !== "Meios de Pagamento") {
        const [y, m] = t.date.split("-");
        const mKey = `${y}-${m}`;

        if (storeMatch) {
          if (!monthlyMap[mKey]) monthlyMap[mKey] = { key: mKey, income: 0 };
          monthlyMap[mKey].income += t.amount;
        }

        // Evolução por Loja (Sempre mostra todas as lojas para efeito de comparação)
        if (!monthlyStoreMap[mKey])
          monthlyStoreMap[mKey] = { key: mKey, stores: {} };
        monthlyStoreMap[mKey].stores[t.store] =
          (monthlyStoreMap[mKey].stores[t.store] || 0) + t.amount;
      }

      if (!inRange || !storeMatch) return;

      if (t.type === "entrada") {
        if (t.category === "Meios de Pagamento") {
          const method = t.description
            ? t.description.replace("Pagamento - ", "")
            : "Outros";
          payMap[method] = (payMap[method] || 0) + t.amount;
        } else {
          totalIncome += t.amount;
          if (dateMap[t.date]) dateMap[t.date].income += t.amount;
        }
      } else if (t.type === "saida") {
        if (t.category !== "Descontos") {
          totalExpense += t.amount;
          if (dateMap[t.date]) dateMap[t.date].expense += t.amount;
          catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        }
      }
    });

    const dailyArray = Object.values(dateMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const maxDaily = Math.max(
      ...dailyArray.map((d) => Math.max(d.income, d.expense, 1))
    ); // at least 1 to avoid div by zero

    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const monthlyArray = Object.values(monthlyMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => {
        const [y, mo] = m.key.split("-");
        return {
          ...m,
          label: `${monthNames[parseInt(mo, 10) - 1]}/${y.slice(2)}`,
        };
      });
    const maxMonthly = Math.max(...monthlyArray.map((m) => m.income), 1);

    const monthlyStoreArray = Object.values(monthlyStoreMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => {
        const [y, mo] = m.key.split("-");
        return {
          ...m,
          label: `${monthNames[parseInt(mo, 10) - 1]}/${y.slice(2)}`,
        };
      });
    const maxMonthlyStore = Math.max(
      ...monthlyStoreArray.flatMap((m) => Object.values(m.stores)),
      1
    );

    const catArray = Object.entries(catMap)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);
    const maxCat = Math.max(...catArray.map((c) => c.val), 1);

    const payArray = Object.entries(payMap)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val);
    const maxPay = Math.max(...payArray.map((p) => p.val), 1);

    const storeArray = Object.entries(storeMap).map(([name, data]) => ({
      name,
      ...data,
    }));
    const maxStore = Math.max(
      ...storeArray.map((s) => Math.max(s.income, s.expense)),
      1
    );

    return {
      totalIncome,
      totalExpense,
      dailyArray,
      maxDaily,
      monthlyArray,
      maxMonthly,
      monthlyStoreArray,
      maxMonthlyStore,
      catArray,
      maxCat,
      payArray,
      maxPay,
      storeArray,
      maxStore,
    };
  }, [transactions, startDate, endDate, storeFilter]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <header>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center">
            <BarChart3 className="mr-3 text-indigo-500" size={32} />
            Gráficos e Relatórios
          </h2>
          <p className="text-slate-500 mt-1">
            Análises visuais do desempenho das suas lojas.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
              Loja
            </label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded p-1 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">Todas as Lojas</option>
              {STORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded p-1 text-sm text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded p-1 text-sm text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* CHARTS MENSAIS (HISTÓRICO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 0: EVOLUÇÃO MENSAL DE FATURAMENTO GERAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center">
            <TrendingUp className="mr-2 text-emerald-500" size={20} />
            Faturamento Geral (Histórico)
          </h3>

          {reportData.monthlyArray.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              Nenhum faturamento registrado.
            </div>
          ) : (
            <div className="h-64 flex items-end gap-2 sm:gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {reportData.monthlyArray.map((month) => {
                const incPct = (month.income / reportData.maxMonthly) * 100;
                return (
                  <div
                    key={month.key}
                    className="flex-1 min-w-[40px] max-w-[80px] flex flex-col justify-end items-center group relative h-full"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl whitespace-nowrap">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1">
                        {month.label}
                      </p>
                      <p className="text-emerald-400 font-bold">
                        Faturamento: {formatCurrency(month.income)}
                      </p>
                    </div>

                    <div
                      className="w-full bg-emerald-500 rounded-t-md transition-all duration-300 hover:bg-emerald-400"
                      style={{ height: `${incPct}%` }}
                    ></div>
                    <div className="mt-3 text-xs text-slate-500 font-bold whitespace-nowrap">
                      {month.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 0.5: EVOLUÇÃO MENSAL POR LOJA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Store className="mr-2 text-indigo-500" size={20} />
              Evolução por Loja
            </div>
            <div className="flex text-xs space-x-3 font-normal">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></div>{" "}
                Centro
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div>{" "}
                Arena
              </span>
            </div>
          </h3>

          {reportData.monthlyStoreArray.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              Nenhum faturamento registrado.
            </div>
          ) : (
            <div className="h-64 flex items-end gap-3 sm:gap-6 overflow-x-auto pb-2 custom-scrollbar">
              {reportData.monthlyStoreArray.map((month) => {
                const val1 = month.stores[STORES[0]] || 0;
                const val2 = month.stores[STORES[1]] || 0;
                const pct1 = (val1 / reportData.maxMonthlyStore) * 100;
                const pct2 = (val2 / reportData.maxMonthlyStore) * 100;

                return (
                  <div
                    key={month.key}
                    className="flex-1 min-w-[50px] max-w-[90px] flex flex-col justify-end items-center group relative h-full"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl whitespace-nowrap">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1">
                        {month.label}
                      </p>
                      <p className="text-indigo-400 font-bold">
                        {STORES[0]}: {formatCurrency(val1)}
                      </p>
                      <p className="text-amber-400 font-bold">
                        {STORES[1]}: {formatCurrency(val2)}
                      </p>
                    </div>

                    <div className="w-full flex items-end gap-[2px] h-[90%]">
                      <div
                        className="w-1/2 bg-indigo-500 rounded-t-md transition-all duration-300 hover:bg-indigo-400"
                        style={{ height: `${pct1}%` }}
                      ></div>
                      <div
                        className="w-1/2 bg-amber-500 rounded-t-md transition-all duration-300 hover:bg-amber-400"
                        style={{ height: `${pct2}%` }}
                      ></div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 font-bold whitespace-nowrap">
                      {month.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CHART 1: EVOLUÇÃO DIÁRIA (PREMIUM DARK) */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Activity size={200} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-2 flex items-center">
            Fluxo de Caixa Diário
          </h3>
          <div className="flex items-center space-x-6 text-sm mb-6">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
              <span className="text-emerald-100">
                Receitas ({formatCurrency(reportData.totalIncome)})
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div>
              <span className="text-rose-100">
                Despesas ({formatCurrency(reportData.totalExpense)})
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end gap-1 sm:gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {reportData.dailyArray.map((day) => {
              const incPct = (day.income / reportData.maxDaily) * 100;
              const expPct = (day.expense / reportData.maxDaily) * 100;
              const dateStr = new Date(
                day.date + "T12:00:00"
              ).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });

              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-[24px] flex flex-col justify-end items-center group relative h-full"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 bg-white text-slate-800 text-xs p-3 rounded-lg shadow-xl border border-slate-200 whitespace-nowrap">
                    <p className="font-bold text-slate-900 mb-1 border-b pb-1">
                      {new Date(day.date + "T12:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                    <p className="text-emerald-600 font-medium">
                      Entradas: {formatCurrency(day.income)}
                    </p>
                    <p className="text-rose-600 font-medium">
                      Saídas: {formatCurrency(day.expense)}
                    </p>
                    <p className="text-indigo-600 font-bold mt-1 pt-1 border-t">
                      Resultado: {formatCurrency(day.income - day.expense)}
                    </p>
                  </div>

                  <div className="w-full flex items-end gap-[1px] sm:gap-[2px] h-[90%]">
                    <div
                      className="w-1/2 bg-emerald-500 rounded-t-sm transition-all duration-300 hover:bg-emerald-400"
                      style={{ height: `${incPct}%` }}
                    ></div>
                    <div
                      className="w-1/2 bg-rose-500 rounded-t-sm transition-all duration-300 hover:bg-rose-400"
                      style={{ height: `${expPct}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-[9px] sm:text-[10px] text-slate-400 font-medium whitespace-nowrap transform -rotate-45 sm:rotate-0 origin-top-left sm:origin-center">
                    {dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 2: MAIORES DESPESAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center">
            <PieChart className="mr-2 text-rose-500" size={20} />
            Ranking de Despesas
          </h3>
          {reportData.catArray.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              Nenhuma despesa no período.
            </div>
          ) : (
            <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {reportData.catArray.map((cat, i) => {
                const pct = (cat.val / reportData.maxCat) * 100;
                const totalPct =
                  reportData.totalExpense > 0
                    ? (cat.val / reportData.totalExpense) * 100
                    : 0;
                return (
                  <div key={cat.name} className="group">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-700 flex items-center">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 mr-2">
                          {i + 1}
                        </span>
                        {cat.name}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {formatCurrency(cat.val)}{" "}
                        <span className="text-xs text-slate-400 font-medium ml-1">
                          ({totalPct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500 group-hover:bg-rose-400"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 3: MEIOS DE PAGAMENTO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center">
            <CreditCard className="mr-2 text-emerald-500" size={20} />
            Meios de Pagamento Recebidos
          </h3>
          {reportData.payArray.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              Nenhum pagamento importado no período.
            </div>
          ) : (
            <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {reportData.payArray.map((pay, i) => {
                const pct = (pay.val / reportData.maxPay) * 100;
                return (
                  <div key={pay.name} className="group">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-700 flex items-center">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] text-emerald-600 mr-2">
                          {i + 1}
                        </span>
                        {pay.name}
                      </span>
                      <span className="text-emerald-700 font-bold">
                        {formatCurrency(pay.val)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500 group-hover:bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHART 4: COMPARATIVO DE LOJAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-4 flex items-center">
            <Store className="mr-2 text-indigo-500" size={20} />
            Comparativo de Unidades
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reportData.storeArray.map((st) => {
              const incPct = (st.income / reportData.maxStore) * 100;
              const expPct = (st.expense / reportData.maxStore) * 100;
              const net = st.income - st.expense;
              const margin = st.income > 0 ? (net / st.income) * 100 : 0;

              return (
                <div
                  key={st.name}
                  className="bg-slate-50 p-5 rounded-xl border border-slate-100"
                >
                  <h4 className="font-bold text-slate-800 text-lg mb-4">
                    {st.name}
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500 font-medium">
                          Receitas
                        </span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(st.income)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${incPct}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500 font-medium">
                          Despesas
                        </span>
                        <span className="font-bold text-rose-600">
                          {formatCurrency(st.expense)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${expPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Lucro da Unidade
                      </p>
                      <p
                        className={`text-xl font-bold ${
                          net >= 0 ? "text-indigo-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(net)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                        Margem
                      </p>
                      <p
                        className={`font-bold ${
                          margin >= 15
                            ? "text-emerald-500"
                            : margin > 0
                            ? "text-amber-500"
                            : "text-rose-500"
                        }`}
                      >
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
}
