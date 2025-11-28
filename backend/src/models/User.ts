import sql from 'mssql';
import { getPool } from '../config/db';

export type UserRole = 'hr' | 'employee';

export interface IUser {
  id: string | number;
  role: UserRole;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  empCode: string;
  passwordHash: string; // will contain plaintext from self_password for now
  createdAt: Date | null;
  updatedAt: Date | null;
}

function mapRole(appRole: number | null | undefined): UserRole {
  // Adjust mapping if you have specific codes; default: 1=hr else employee
  return appRole === 1 ? 'hr' : 'employee';
}

function mapRow(row: any): IUser {
  return {
    id: row.id,
    role: mapRole(row.app_role),
    firstName: row.first_name,
    middleName: null,
    lastName: row.last_name,
    email: row.email ?? '',
    empCode: row.emp_code ?? '',
    passwordHash: row.self_password ?? '',
    createdAt: row.create_time ?? null,
    updatedAt: row.change_time ?? null,
  };
}

export const User = {
  async findOne(filter: { empCode?: string }): Promise<IUser | null> {
    const db = getPool();
    if (filter.empCode) {
      const result = await db
        .request()
        .input('EmpCode', sql.NVarChar(20), filter.empCode)
        .query(`SELECT TOP 1 id, app_role, first_name, last_name, email, emp_code, self_password, create_time, change_time
                FROM dbo.personnel_employee WHERE emp_code = @EmpCode`);
      const row = result.recordset[0];
      return row ? mapRow(row) : null;
    }
    return null;
  },

  async findById(id: string | number): Promise<IUser | null> {
    const db = getPool();
    const result = await db
      .request()
      .input('Id', sql.Int, Number(id))
      .query(`SELECT TOP 1 id, app_role, first_name, last_name, email, emp_code, self_password, create_time, change_time
              FROM dbo.personnel_employee WHERE id = @Id`);
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  },

  async create(_data: any): Promise<IUser> {
    // We are not creating users via API; data is seeded manually in existing table.
    throw new Error('NotImplemented: use existing zkbiotime.dbo.personnel_employee for users');
  },
};
