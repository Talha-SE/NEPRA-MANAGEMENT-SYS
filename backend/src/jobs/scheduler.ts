import cron from 'node-cron';
import sql from 'mssql';
import { env } from '../config/env';
import { connectDB, getPool } from '../config/db';

// Balance table and column constants (keep aligned with controllers)
const BALANCE_TABLE = 'dbo.employee_leave_balances';
const COLS = {
  CL_AVAILABLE: 'Casual_Leave_Available',
  EL_NON_AVAIL: 'Non_Encashable_Earned_Leaves_Available',
  EL_NON_APPR: 'Non_Encashable_Earned_Leaves_Approved',
  EL_ENC_AVAIL: 'Encashable_Earned_Leaves_Available',
  EL_ENC_APPR: 'Encashable_Earned_Leaves_Approved',
};

// Log tables for idempotency
const ACCRUAL_LOG = 'dbo.employee_leaves_accrual_log'; // (emp_id, year, month)
const CARRY_LOG = 'dbo.employee_leaves_carry_log'; // (emp_id, year, carried)

// Policy constants (can be moved to a config later)
const CL_YEARLY_ENTITLEMENT = 20; // days
const EL_MONTHLY_INCREMENT_NON = 2; // Non-encashable
const EL_MONTHLY_INCREMENT_ENC = 2; // Encashable
const EL_TOTAL_CAP = 365; // combined cap across encashable + non-encashable
const ATTENDANCE_PRESENT_THRESHOLD = 15; // min present days to earn monthly accrual

// No Redis. We use node-cron to run tasks in-process.

// Ensure required tables for idempotency exist
async function ensureLogTables(db: sql.ConnectionPool) {
  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_leaves_accrual_log')
    BEGIN
      CREATE TABLE ${ACCRUAL_LOG} (
        id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id INT NOT NULL,
        [year] INT NOT NULL,
        [month] INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_accrual_emp_year_month UNIQUE(emp_id, [year], [month])
      );
    END;

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'employee_leaves_carry_log')
    BEGIN
      CREATE TABLE ${CARRY_LOG} (
        id INT IDENTITY(1,1) PRIMARY KEY,
        emp_id INT NOT NULL,
        [year] INT NOT NULL,
        carried INT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_carry_emp_year UNIQUE(emp_id, [year])
      );
    END;
  `);
}

// --- Job handlers ---
async function handleCLYearlyReset() {
  const db = getPool();
  // Reset CL to entitlement; do not alter approved column here
  await db.request().query(`
    UPDATE ${BALANCE_TABLE}
    SET [${COLS.CL_AVAILABLE}] = ${CL_YEARLY_ENTITLEMENT}
  `);
}

// Helper: return [year, month] of previous month for accrual (1..12)
function prevYearMonth(baseDate = new Date()): { year: number; month: number } {
  const y = baseDate.getUTCFullYear();
  const m = baseDate.getUTCMonth() + 1; // 1..12
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

async function handleELMonthlyAccrual() {
  const db = getPool();
  await ensureLogTables(db);

  const { year, month } = prevYearMonth();

  // Eligible employees by attendance (>= 15 present days in previous month)
  const att = await db
    .request()
    .input('y', sql.Int, year)
    .input('m', sql.Int, month)
    .input('threshold', sql.Int, ATTENDANCE_PRESENT_THRESHOLD)
    .query(`
      SELECT emp_id
      FROM dbo.att_payloadtimecard
      WHERE YEAR(att_date) = @y AND MONTH(att_date) = @m AND (
        present = 1
        OR (present IS NULL AND DATEPART(WEEKDAY, att_date) IN (1, 7))
      )
      GROUP BY emp_id
      HAVING COUNT(*) >= @threshold
    `);

  const eligible = att.recordset.map((r: any) => Number(r.emp_id));
  if (eligible.length === 0) return;

  for (const empId of eligible) {
    // Idempotency per (empId, year, month)
    const exists = await db
      .request()
      .input('emp_id', sql.Int, empId)
      .input('y', sql.Int, year)
      .input('m', sql.Int, month)
      .query(`SELECT 1 AS x FROM ${ACCRUAL_LOG} WHERE emp_id = @emp_id AND [year] = @y AND [month] = @m`);
    if (exists.recordset.length > 0) continue;

    // Read current balances
    const balRS = await db.request().input('emp_id', sql.Int, empId).query(`
      SELECT TOP 1 [${COLS.EL_NON_AVAIL}] AS nonAvail, [${COLS.EL_ENC_AVAIL}] AS encAvail
      FROM ${BALANCE_TABLE}
      WHERE emp_id = @emp_id
    `);

    // If no row, create it with zero values before accrual
    if (balRS.recordset.length === 0) {
      await db.request().input('emp_id', sql.Int, empId).query(`
        INSERT INTO ${BALANCE_TABLE} (emp_id, [${COLS.EL_NON_AVAIL}], [${COLS.EL_ENC_AVAIL}]) VALUES (@emp_id, 0, 0)
      `);
    }

    const nonAvail = Number(balRS.recordset[0]?.nonAvail ?? 0);
    const encAvail = Number(balRS.recordset[0]?.encAvail ?? 0);

    // Proposed increments
    let newNon = nonAvail + EL_MONTHLY_INCREMENT_NON;
    let newEnc = encAvail + EL_MONTHLY_INCREMENT_ENC;

    // Enforce total cap of 365 across both buckets
    const totalBefore = nonAvail + encAvail;
    const totalAfter = newNon + newEnc;
    if (totalAfter > EL_TOTAL_CAP) {
      const overflow = totalAfter - EL_TOTAL_CAP;
      // Prefer reducing non-encashable first
      const reduceNon = Math.min(overflow, newNon);
      newNon -= reduceNon;
      const remaining = overflow - reduceNon;
      if (remaining > 0) {
        newEnc = Math.max(0, newEnc - remaining);
      }
    }

    await db
      .request()
      .input('emp_id', sql.Int, empId)
      .input('non', sql.Int, newNon)
      .input('enc', sql.Int, newEnc)
      .query(`
        UPDATE ${BALANCE_TABLE}
        SET [${COLS.EL_NON_AVAIL}] = @non, [${COLS.EL_ENC_AVAIL}] = @enc
        WHERE emp_id = @emp_id
      `);

    await db
      .request()
      .input('emp_id', sql.Int, empId)
      .input('y', sql.Int, year)
      .input('m', sql.Int, month)
      .query(`INSERT INTO ${ACCRUAL_LOG} (emp_id, [year], [month]) VALUES (@emp_id, @y, @m)`);
  }
}

async function handleQuarterlyCaps() {
  const db = getPool();
  // Enforce EL combined cap across all employees
  const rs = await db.request().query(`SELECT emp_id, [${COLS.EL_NON_AVAIL}] AS nonAvail, [${COLS.EL_ENC_AVAIL}] AS encAvail FROM ${BALANCE_TABLE}`);
  for (const r of rs.recordset) {
    const empId = Number(r.emp_id);
    let non = Number(r.nonAvail ?? 0);
    let enc = Number(r.encAvail ?? 0);
    const total = non + enc;
    if (total > EL_TOTAL_CAP) {
      const overflow = total - EL_TOTAL_CAP;
      const reduceNon = Math.min(overflow, non);
      non -= reduceNon;
      const remaining = overflow - reduceNon;
      if (remaining > 0) enc = Math.max(0, enc - remaining);
      await db.request().input('emp_id', sql.Int, empId).input('non', sql.Int, non).input('enc', sql.Int, enc).query(`
        UPDATE ${BALANCE_TABLE}
        SET [${COLS.EL_NON_AVAIL}] = @non, [${COLS.EL_ENC_AVAIL}] = @enc
        WHERE emp_id = @emp_id
      `);
    }
  }
}

// Schedule repeatable jobs via cron
function scheduleJobsCron() {
  const tz = env.TIMEZONE; // e.g., 'Asia/Karachi'

  // Jan 1st 00:30 each year (CL reset)-
  cron.schedule('30 0 1 1 *', async () => {
    try {
      await handleCLYearlyReset();
      console.log('[Jobs] CL yearly reset completed');
    } catch (e) {
      console.error('[Jobs] CL yearly reset failed', e);
    }
  }, tz ? { timezone: tz } : undefined);

  // Day 1 of every month at 01:05 (apply accrual for previous month)
  cron.schedule('5 1 1 * *', async () => {
    try {
      await handleELMonthlyAccrual();
      console.log('[Jobs] EL monthly accrual completed');
    } catch (e) {
      console.error('[Jobs] EL monthly accrual failed', e);
    }
  }, tz ? { timezone: tz } : undefined);

  // Quarter start enforcement (Jan/Apr/Jul/Oct on day 1 at 02:10)
  cron.schedule('10 2 1 1,4,7,10 *', async () => {
    try {
      await handleQuarterlyCaps();
      console.log('[Jobs] Quarterly caps enforcement completed');
    } catch (e) {
      console.error('[Jobs] Quarterly caps enforcement failed', e);
    }
  }, tz ? { timezone: tz } : undefined);
}

// Bootstrap scheduler process
(async () => {
  console.log('[Jobs] Starting scheduler (cron, no Redis)...');
  await connectDB();
  scheduleJobsCron();
  console.log('[Jobs] Cron jobs scheduled.');
})();
