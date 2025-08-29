import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/db';

// Fields we expose on the profile page
const PROFILE_SELECT = `
  SELECT pe.id,
         pe.first_name,
         pe.last_name,
         pe.email,
         pe.mobile,
         pe.contact_tel,
         pe.office_tel,
         pe.address,
         pe.city,
         pe.birthday,
         pe.photo,
         pe.emp_code,
         pe.company_id,
         pc.company_name
    FROM dbo.personnel_employee pe
    LEFT JOIN dbo.personnel_company pc ON pc.id = pe.company_id
   WHERE pe.id = @Id`;

export async function getProfile(req: Request, res: Response) {
  try {
    const id = req.user?.id; // set by auth middleware
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const db = getPool();
    const result = await db
      .request()
      .input('Id', sql.Int, Number(id))
      .query(PROFILE_SELECT);

    const row = result.recordset[0];
    if (!row) return res.status(404).json({ message: 'Profile not found' });

    return res.json({
      profile: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        mobile: row.mobile,
        contactTel: row.contact_tel,
        officeTel: row.office_tel,
        address: row.address,
        city: row.city,
        birthday: row.birthday,
        photo: row.photo,
        empCode: row.emp_code,
        companyId: row.company_id,
        companyName: row.company_name,
      },
    });
  } catch (err) {
    console.error('[profile:get] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Allow editing a safe subset of fields
// Any field omitted is left unchanged
export async function updateProfile(req: Request, res: Response) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const allowed: Record<string, { col: string; type: sql.ISqlTypeFactory | sql.ISqlType; max?: number }> = {
      firstName: { col: 'first_name', type: sql.NVarChar(100) },
      lastName: { col: 'last_name', type: sql.NVarChar(100) },
      email: { col: 'email', type: sql.NVarChar(50) },
      mobile: { col: 'mobile', type: sql.NVarChar(20) },
      contactTel: { col: 'contact_tel', type: sql.NVarChar(20) },
      officeTel: { col: 'office_tel', type: sql.NVarChar(20) },
      address: { col: 'address', type: sql.NVarChar(200) },
      city: { col: 'city', type: sql.NVarChar(20) },
      birthday: { col: 'birthday', type: sql.Date },
      photo: { col: 'photo', type: sql.NVarChar(200) },
    };

    const body = req.body as Record<string, unknown>;
    const sets: string[] = [];
    const db = getPool();
    const request = db.request();

    Object.entries(allowed).forEach(([key, meta]) => {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        const paramName = `p_${meta.col}`;
        sets.push(`${meta.col} = @${paramName}`);
        // @ts-ignore - types for mssql factory unions
        request.input(paramName, meta.type, body[key] as any);
      }
    });

    if (sets.length === 0) {
      return res.status(400).json({ message: 'No editable fields provided' });
    }

    request.input('Id', sql.Int, Number(id));
    const sqlText = `UPDATE dbo.personnel_employee SET ${sets.join(', ')}, change_time = SYSUTCDATETIME() WHERE id = @Id`;
    await request.query(sqlText);

    // return the updated profile
    const refreshed = await db
      .request()
      .input('Id', sql.Int, Number(id))
      .query(PROFILE_SELECT);

    const row = refreshed.recordset[0];
    return res.json({
      profile: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        mobile: row.mobile,
        contactTel: row.contact_tel,
        officeTel: row.office_tel,
        address: row.address,
        city: row.city,
        birthday: row.birthday,
        photo: row.photo,
        empCode: row.emp_code,
        companyId: row.company_id,
        companyName: row.company_name,
      },
    });
  } catch (err) {
    console.error('[profile:update] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
