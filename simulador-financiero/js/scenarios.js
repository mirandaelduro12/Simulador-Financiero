// scenarios.js
// Un escenario nunca modifica los datos reales (income/expenses/debts en
// storage). En vez de eso, produce una copia "hipotética" del estado y la
// pasa por el mismo motor de cálculos (calculations.js) para poder comparar.

import { buildSummary, projectGoal } from './calculations.js';

export const SCENARIO_TYPES = {
  INCOME_INCREASE: 'income_increase',
  EXPENSE_REDUCTION: 'expense_reduction',
  NEW_DEBT: 'new_debt',
  DEBT_PAYMENT_INCREASE: 'debt_payment_increase',
  EXTRA_SAVINGS: 'extra_savings'
};

export const SCENARIO_LABELS = {
  [SCENARIO_TYPES.INCOME_INCREASE]: 'Aumentar ingresos',
  [SCENARIO_TYPES.EXPENSE_REDUCTION]: 'Reducir un gasto',
  [SCENARIO_TYPES.NEW_DEBT]: 'Adquirir una nueva deuda',
  [SCENARIO_TYPES.DEBT_PAYMENT_INCREASE]: 'Aumentar una cuota mensual',
  [SCENARIO_TYPES.EXTRA_SAVINGS]: 'Ahorrar un monto adicional'
};

// Aplica el escenario sobre una copia profunda del estado base y devuelve
// el nuevo estado hipotético (income/expenses/debts modificados).
export function applyScenario(baseState, scenario) {
  const state = {
    income: baseState.income.map(r => ({ ...r })),
    expenses: baseState.expenses.map(r => ({ ...r })),
    debts: baseState.debts.map(r => ({ ...r }))
  };

  const amount = Number(scenario.params.amount) || 0;

  switch (scenario.type) {
    case SCENARIO_TYPES.INCOME_INCREASE:
      state.income.push({
        id: '__scenario__', description: scenario.name || 'Ingreso simulado',
        amount, category: 'otros', frequency: 'mensual'
      });
      break;

    case SCENARIO_TYPES.EXPENSE_REDUCTION: {
      const targetCategory = scenario.params.category;
      let remaining = amount;
      state.expenses = state.expenses.map(exp => {
        if (remaining <= 0) return exp;
        if (targetCategory && exp.category !== targetCategory) return exp;
        const reduceBy = Math.min(exp.amount, remaining);
        remaining -= reduceBy;
        return { ...exp, amount: exp.amount - reduceBy };
      });
      break;
    }

    case SCENARIO_TYPES.NEW_DEBT:
      state.debts.push({
        id: '__scenario__', name: scenario.name || 'Deuda simulada',
        remainingBalance: amount,
        monthlyPayment: Number(scenario.params.monthlyPayment) || 0,
        interestRate: Number(scenario.params.interestRate) || 0
      });
      break;

    case SCENARIO_TYPES.DEBT_PAYMENT_INCREASE: {
      const debtId = scenario.params.debtId;
      state.debts = state.debts.map(d =>
        d.id === debtId ? { ...d, monthlyPayment: (Number(d.monthlyPayment) || 0) + amount } : d
      );
      break;
    }

    case SCENARIO_TYPES.EXTRA_SAVINGS:
      state.expenses.push({
        id: '__scenario__', description: scenario.name || 'Ahorro adicional',
        amount, category: 'otros', frequency: 'mensual'
      });
      break;

    default:
      break;
  }

  return state;
}

export function compareScenario(baseState, scenario) {
  const hypotheticalState = applyScenario(baseState, scenario);
  const baseSummary = buildSummary(baseState);
  const scenarioSummary = buildSummary(hypotheticalState);

  const diff = {
    available: round(scenarioSummary.available - baseSummary.available),
    savingsRate: round(scenarioSummary.savingsRate - baseSummary.savingsRate),
    expenseRatio: round(scenarioSummary.expenseRatio - baseSummary.expenseRatio),
    debtRatio: round(scenarioSummary.debtRatio - baseSummary.debtRatio)
  };

  return { baseSummary, scenarioSummary, diff };
}

// Compara cuánto tiempo tardaría un objetivo bajo el escenario vs el estado actual.
export function compareGoalUnderScenario(goal, baseState, scenario) {
  const before = projectGoal(goal);
  const extraMonthly = scenario.type === SCENARIO_TYPES.EXTRA_SAVINGS || scenario.type === SCENARIO_TYPES.INCOME_INCREASE
    ? Number(scenario.params.amount) || 0
    : 0;
  const after = projectGoal({ ...goal, monthlyContribution: (Number(goal.monthlyContribution) || 0) + extraMonthly });
  return { before, after };
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
