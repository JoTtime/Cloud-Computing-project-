import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'src/environments/environment.prod.ts');

// DEBUG - add this line
console.log('ENV VARS:', process.env.USER_API_URL, process.env.DOCTOR_API_URL);

const env = {
  production: true,
  apiUrl: process.env.USER_API_URL || 'https://usermicroservice-omdq.onrender.com/api',
  appointmentApiUrl: process.env.APPOINTMENT_API_URL || 'https://appointmentmicroservice.onrender.com/api',
  doctorApiUrl: process.env.DOCTOR_API_URL || 'https://doctormicroservice.onrender.com/api',
  patientApiUrl: process.env.PATIENT_API_URL || 'https://patientmicroservice.onrender.com/api'
};

const fileContent = `export const environment = ${JSON.stringify(env, null, 2)};\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Generated ${outputPath}`);
console.log('Generated with URLs:', JSON.stringify(env, null, 2));