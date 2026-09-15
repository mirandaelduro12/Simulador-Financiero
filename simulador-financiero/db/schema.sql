CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'mensual',
  amount REAL NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'mensual',
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'app',
  externalId TEXT
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  remainingBalance REAL NOT NULL DEFAULT 0,
  monthlyPayment REAL NOT NULL DEFAULT 0,
  interestRate REAL NOT NULL DEFAULT 0,
  initialAmount REAL NOT NULL DEFAULT 0,
  startDate TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  targetAmount REAL NOT NULL DEFAULT 0,
  currentSaved REAL NOT NULL DEFAULT 0,
  monthlyContribution REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  desiredDate TEXT,
  priority TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  name TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_externalId ON expenses(externalId) WHERE externalId IS NOT NULL;
