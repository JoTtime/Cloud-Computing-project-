import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'src/environments/environment.prod.ts');

const env = {
  production: true,
  apiUrl: process.env.USER_API_URL || 'http://localhost:8086/api',
  appointmentApiUrl: process.env.APPOINTMENT_API_URL || 'http://localhost:8087/api',
  doctorApiUrl: process.env.DOCTOR_API_URL || 'http://localhost:8088/api',
  patientApiUrl: process.env.PATIENT_API_URL || 'http://localhost:8089/api'
};

const fileContent = `export const environment = ${JSON.stringify(env, null, 2)};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${outputPath}`);
