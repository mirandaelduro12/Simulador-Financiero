// calculations.js
// Núcleo de cálculo puro (sin DOM, sin storage) para que sea fácil de
// probar y, más adelante, de portar al backend / módulo de Python.

const FREQUENCY_FACTOR = {
  mensual: 1,
  quincenal: 2,
  semanal: 4.33,
  ocasional: 0 // los ingresos/gastos ocasionales no se cuentan en el recurrente mensual
};

export function toMonthlyAmount(amount, frequency) {
  const factor = FREQUENCY_FACTOR[frequency] ?? 1;
  return round(amount * factor);
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------- Totales ----------

export function sumMonthly(records) {
  const now = new Date();
  return round(records.reduce((acc, r) => {
    // Los movimientos recurrentes representan un compromiso mensual.
    // Los gastos/ingresos ocasionales solo impactan el mes en que ocurrieron.
    if (r.frequency === 'ocasional') {
      const d = r.date ? new Date(`${r.date}T00:00:00`) : null;
      if (!d || d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return acc;
      return acc + (Number(r.amount) || 0);
    }
    return acc + toMonthlyAmount(r.amount, r.frequency);
  }, 0));
}

export function sumDebtPayments(debts) {
  return round(debts.reduce((acc, d) => acc + (Number(d.monthlyPayment) || 0), 0));
}

export function buildSummary({ income, expenses, debts }) {
  const totalIncome = sumMonthly(income);
  const totalExpenses = sumMonthly(expenses);
  const totalDebtPayments = sumDebtPayments(debts);
  const available = round(totalIncome - totalExpenses - totalDebtPayments);
  const expenseRatio = totalIncome > 0 ? round((totalExpenses / totalIncome) * 100) : 0;
  const debtRatio = totalIncome > 0 ? round((totalDebtPayments / totalIncome) * 100) : 0;
  const savingsRate = totalIncome > 0 ? round((available / totalIncome) * 100) : 0;

  return {
    totalIncome, totalExpenses, totalDebtPayments,
    available, expenseRatio, debtRatio, savingsRate
  };
}

export function groupByCategory(records) {
  const map = new Map();
  records.forEach(r => {
    const monthly = toMonthlyAmount(r.amount, r.frequency);
    map.set(r.category, (map.get(r.category) || 0) + monthly);
  });
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total: round(total) }))
    .sort((a, b) => b.total - a.total);
}

// ---------- Deudas ----------
// Amortización tipo cuota fija (sistema francés simplificado) para estimar
// cuántos meses faltan y cuánto interés total se pagará dada la cuota actual.

export function projectDebtPayoff(debt) {
  const balance = Number(debt.remainingBalance) || 0;
  const monthlyRate = (Number(debt.interestRate) || 0) / 100 / 12;
  const payment = Number(debt.monthlyPayment) || 0;

  if (balance <= 0) return { months: 0, totalInterest: 0, totalCost: 0, feasible: true };
  if (payment <= 0) return { months: Infinity, totalInterest: Infinity, totalCost: Infinity, feasible: false };

  // Si la cuota no alcanza a cubrir ni el interés del primer mes, la deuda nunca se paga.
  if (monthlyRate > 0 && payment <= balance * monthlyRate) {
    return { months: Infinity, totalInterest: Infinity, totalCost: Infinity, feasible: false };
  }

  let remaining = balance;
  let months = 0;
  let totalInterest = 0;
  const MAX_MONTHS = 1200; // límite de seguridad (100 años)

  while (remaining > 0.01 && months < MAX_MONTHS) {
    const interest = remaining * monthlyRate;
    let principal = payment - interest;
    if (principal > remaining) principal = remaining;
    remaining -= principal;
    totalInterest += interest;
    months += 1;
  }

  return {
    months,
    totalInterest: round(totalInterest),
    totalCost: round(balance + totalInterest),
    feasible: months < MAX_MONTHS
  };
}

// ---------- Objetivos ----------

export function projectGoal(goal) {
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentSaved) || 0;
  const monthly = Number(goal.monthlyContribution) || 0;
  const remaining = Math.max(round(target - current), 0);
  const progressPct = target > 0 ? round((current / target) * 100) : 0;

  if (remaining === 0) return { remaining: 0, monthsLeft: 0, progressPct: 100, estimatedDate: null };
  if (monthly <= 0) return { remaining, monthsLeft: Infinity, progressPct, estimatedDate: null };

  const monthsLeft = Math.ceil(remaining / monthly);
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + monthsLeft);

  return { remaining, monthsLeft, progressPct, estimatedDate: estimatedDate.toISOString() };
}

// aporte mensual necesario para llegar en N meses
export function requiredContribution(goal, monthsTarget) {
  const remaining = Math.max((Number(goal.targetAmount) || 0) - (Number(goal.currentSaved) || 0), 0);
  if (monthsTarget <= 0) return remaining;
  return round(remaining / monthsTarget);
}

// ---------- Proyecciones a futuro ----------
// Proyecta el saldo disponible acumulado mes a mes asumiendo que ingresos,
// gastos y cuotas de deuda se mantienen constantes (modelo lineal simple).

export function generateProjection(summary, months) {
  const points = [];
  let cumulativeSavings = 0;
  for (let i = 1; i <= months; i++) {
    cumulativeSavings = round(cumulativeSavings + summary.available);
    points.push({
      month: i,
      income: summary.totalIncome,
      expenses: summary.totalExpenses + summary.totalDebtPayments,
      monthlyAvailable: summary.available,
      cumulativeSavings
    });
  }
  return points;
}

// ---------- Simulador de compras ----------

export function simulatePurchase({ price, currentAvailable, currentSavings = 0, financing }) {
  const contado = {
    impactOnAvailable: round(currentAvailable - price),
    savingsAfter: round(currentSavings - price)
  };

  const savePrevious = {
    monthsToSave: currentAvailable > 0 ? Math.ceil(price / currentAvailable) : Infinity
  };

  let financed = null;
  if (financing && financing.months > 0) {
    const monthlyRate = (financing.annualInterestRate || 0) / 100 / 12;
    let quota;
    if (monthlyRate === 0) {
      quota = price / financing.months;
    } else {
      quota = (price * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -financing.months));
    }
    const totalCost = quota * financing.months;
    financed = {
      monthlyQuota: round(quota),
      totalCost: round(totalCost),
      totalInterest: round(totalCost - price),
      impactOnAvailable: round(currentAvailable - quota)
    };
  }

  return { contado, savePrevious, financed };
}

// ---------- Reglas de recomendación ----------

export const RULES = {
  expenseRatioAlert: 70,   // % de ingresos en gastos
  debtRatioAlert: 30,      // % de ingresos en deuda
  savingsRateWarning: 10   // % mínimo saludable de ahorro
};

export function evaluateRules(summary) {
  const alerts = [];

  if (summary.expenseRatio > RULES.expenseRatioAlert) {
    alerts.push({
      level: 'negative',
      message: `Tus gastos representan el ${summary.expenseRatio}% de tus ingresos, por encima del ${RULES.expenseRatioAlert}% recomendado.`
    });
  }
  if (summary.debtRatio > RULES.debtRatioAlert) {
    alerts.push({
      level: 'negative',
      message: `Tu deuda representa el ${summary.debtRatio}% de tus ingresos mensuales, por encima del ${RULES.debtRatioAlert}% recomendado.`
    });
  }
  if (summary.savingsRate < RULES.savingsRateWarning) {
    alerts.push({
      level: 'warning',
      message: `Tu capacidad de ahorro es de ${summary.savingsRate}%. Se recomienda mantenerla por encima del ${RULES.savingsRateWarning}%.`
    });
  }
  if (summary.available < 0) {
    alerts.push({
      level: 'negative',
      message: `Tus gastos y deudas superan tus ingresos por ${Math.abs(summary.available).toFixed(2)} este mes.`
    });
  }
  if (alerts.length === 0) {
    alerts.push({ level: 'positive', message: 'Tu situación financiera actual está dentro de los rangos saludables.' });
  }
  return alerts;
}
