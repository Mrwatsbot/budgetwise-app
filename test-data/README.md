# Test Data — Import Templates

Sample CSV files for testing the Smart CSV Import feature.

## Files

### `ynab-sample-register.csv`
YNAB's transaction export (Register.csv from their ZIP export).
- **Headers:** Account, Flag, Date, Payee, Category Group/Category, Memo, Outflow, Inflow, Cleared
- **Notes:** Outflow/Inflow are separate columns (not a single Amount). Currency formatted with $ and commas. Transfers show as "Transfer: [Account Name]". Flags are color names (Red, Green, Orange, etc.) or blank. Cleared status: Cleared, Uncleared, or Reconciled. Starting balances included.

### `ynab-sample-budget.csv`
YNAB's budget allocation export (Budget.csv from their ZIP export).
- **Headers:** Month, Category Group/Category, Category Group, Category, Budgeted, Activity, Available
- **Notes:** Month format is "MMM YYYY" (e.g. "Jan 2025"). Category Group/Category is the combined field, plus separate Category Group and Category columns. Activity is negative (spending). Available rolls over between months.
- **⚠️ NEEDS VERIFICATION:** These headers are based on community knowledge and the YNAB data model. Verify against a real YNAB export before shipping the Budget.csv parser.

### `monarch-sample.csv`
Monarch Money's transaction export.
- **Headers:** Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags
- **Notes:** Single Amount column (positive = income, negative = expense). Date format: YYYY-MM-DD. Tags are comma-separated.

### `mint-sample.csv`
Mint's transaction export (legacy — Mint is dead but millions have saved CSVs).
- **Headers:** Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, Labels, Notes
- **Notes:** Amount is always positive — Transaction Type ("credit"/"debit") determines direction. Date format: M/D/YYYY.

## Usage
Upload these files through Settings → Import Data to test the parser.
For YNAB, the real export is a ZIP containing both Register.csv and Budget.csv.
