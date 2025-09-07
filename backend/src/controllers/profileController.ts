import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/db';
import path from 'path';

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
    const qEmp = (req.query.empId as string | undefined)?.trim();
    let targetId: number | null = null;
    if (qEmp && qEmp.length > 0) {
      if (req.user?.role !== 'hr') return res.status(403).json({ message: 'Forbidden' });
      const n = Number(qEmp);
      if (!Number.isInteger(n) || n <= 0) return res.status(400).json({ message: 'Invalid empId' });
      targetId = n;
    } else {
      const selfId = req.user?.id; // set by auth middleware
      if (!selfId) return res.status(401).json({ message: 'Unauthorized' });
      targetId = Number(selfId);
    }

    const db = getPool();
    const result = await db
      .request()
      .input('Id', sql.Int, Number(targetId))
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

// HR-only search endpoint for employees by name/email/emp_code/id
export async function searchEmployees(req: Request, res: Response) {
  try {
    if (req.user?.role !== 'hr') return res.status(403).json({ message: 'Forbidden' });

    const q = (req.query.q as string | undefined)?.trim();
    const limitRaw = (req.query.limit as string | undefined) ?? '10';
    const limitNum = Number(limitRaw);
    const limit = Number.isInteger(limitNum) && limitNum > 0 && limitNum <= 100 ? limitNum : 10;

    if (!q || q.length === 0) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    const db = getPool();
    const request = db
      .request()
      .input('Q', sql.NVarChar(100), q)
      .input('Limit', sql.Int, limit);

    const qNum = Number(q);
    const hasNumeric = Number.isInteger(qNum);
    if (hasNumeric) request.input('QId', sql.Int, qNum);

    const whereParts: string[] = [
      "pe.first_name LIKE '%' + @Q + '%'",
      "pe.last_name LIKE '%' + @Q + '%'",
      "pe.email LIKE '%' + @Q + '%'",
      "pe.emp_code LIKE '%' + @Q + '%'",
    ];
    if (hasNumeric) whereParts.push('pe.id = @QId');

    const sqlText = `
      SELECT TOP (@Limit)
             pe.id,
             pe.first_name,
             pe.last_name,
             pe.email,
             pe.emp_code,
             pe.company_id,
             pc.company_name
        FROM dbo.personnel_employee pe
        LEFT JOIN dbo.personnel_company pc ON pc.id = pe.company_id
       WHERE ${whereParts.join(' OR ')}
       ORDER BY pe.first_name, pe.last_name`;

    const result = await request.query(sqlText);
    const results = result.recordset.map((row: any) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      empCode: row.emp_code,
      companyId: row.company_id,
      companyName: row.company_name,
    }));

    return res.json({ results });
  } catch (err) {
    console.error('[profile:searchEmployees] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Upload profile photo (multer provides req.file)
export async function uploadPhoto(req: Request, res: Response) {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    // multer attaches `file` on the request
    const file = (req as any).file as any | undefined;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Store a web-accessible path (served from /uploads)
    const rel = path.join('/uploads', path.relative(path.join(process.cwd(), 'uploads'), file.path)).replace(/\\/g, '/');

    const db = getPool();
    await db
      .request()
      .input('Id', sql.Int, Number(id))
      .input('Photo', sql.NVarChar(200), rel)
      .query('UPDATE dbo.personnel_employee SET photo = @Photo, change_time = SYSUTCDATETIME() WHERE id = @Id');

    // Return updated profile
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
    console.error('[profile:uploadPhoto] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Allow editing a safe subset of fields
// Any field omitted is left unchanged
export async function updateProfile(req: Request, res: Response) {
  try {
    const qEmp = (req.query.empId as string | undefined)?.trim();
    let targetId: number | null = null;
    if (qEmp && qEmp.length > 0) {
      if (req.user?.role !== 'hr') return res.status(403).json({ message: 'Forbidden' });
      const n = Number(qEmp);
      if (!Number.isInteger(n) || n <= 0) return res.status(400).json({ message: 'Invalid empId' });
      targetId = n;
    } else {
      const selfId = req.user?.id;
      if (!selfId) return res.status(401).json({ message: 'Unauthorized' });
      targetId = Number(selfId);
    }

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

    request.input('Id', sql.Int, Number(targetId));
    const sqlText = `UPDATE dbo.personnel_employee SET ${sets.join(', ')}, change_time = SYSUTCDATETIME() WHERE id = @Id`;
    await request.query(sqlText);

    // return the updated profile
    const refreshed = await db
      .request()
      .input('Id', sql.Int, Number(targetId))
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
