# Cloud-Computing-Project

A cloud-based appointment management platform using a microservices architecture with Java Spring Boot, Angular frontend, PostgreSQL database, containerized via Docker, and deployed on Render with CI/CD via GitHub Actions.

---

## 🏗️ Project Structure

- **appointmentmicroservice/** — Manages appointments (Spring Boot)
- **doctormicroservice/** — Manages doctors (Spring Boot)
- **patientmicroservice/** — Manages patients (Spring Boot)
- **usermicroservice/** — Manages authentication and users (Spring Boot)
- **src/** — Angular frontend application
- **Dockerfiles** — For each service and the frontend
- **.github/workflows/ci.yml** — GitHub Actions for CI/CD
- **render.yaml / DEPLOY_RENDER.md** — Render deployment configuration

---

## 🚀 Tech Stack

- **Backend:** Java, Spring Boot (microservices)
- **Frontend:** Angular
- **Database:** PostgreSQL
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Cloud Deployment:** Render
- **API:** RESTful

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/JoTtime/Cloud-Computing-project-.git
cd Cloud-Computing-project-
```

### 2. Environment Variables

- Set up `.env` files or configure environment variables on Render for database URL, credentials, etc., for each service.

### 3. Build Microservices (Spring Boot)

For each microservice (`appointmentmicroservice`, `doctormicroservice`, `patientmicroservice`, `usermicroservice`):

```bash
cd <microservice>
./mvnw clean package
```
or
```bash
mvnw.cmd clean package
```
on Windows.

### 4. Build & Run Frontend (Angular)

```bash
cd src
npm install
npm run build
npm start
```

### 5. Local Setup with Docker Compose

_Optional:_ Create a `docker-compose.yml` file to orchestrate multi-container setup (or use individual Dockerfiles for each service).

```bash
docker-compose up --build
```

---

## ☁️ Cloud Deployment (Render)

- Each service is deployed as a separate Render service using Docker.
- Infrastructure is described in `render.yaml` and deployment steps in `DEPLOY_RENDER.md`.
- Set environment variables/secrets in Render dashboard as per your configuration.

---

## 🤖 CI/CD

- Automated tests and builds performed via GitHub Actions (`.github/workflows/ci.yml`)
- On every push/PR, pipeline runs tests, builds Docker images, and can deploy to Render.

---

## 🔌 API Endpoints

Each microservice exposes its own set of REST endpoints, e.g.:

- `usermicroservice` — `/api/users`, `/api/auth`
- `doctormicroservice` — `/api/doctors`
- `patientmicroservice` — `/api/patients`
- `appointmentmicroservice` — `/api/appointments`

Refer to individual microservice README files for detailed endpoints and request/response formats.

---

## 🗄️ Database

- **PostgreSQL** as the primary database.
- Configure connection properties in each service's `application.properties`.

---

## 📑 Project Structure (Example)

```plaintext
/
├─ appointmentmicroservice/
│   ├─ src/
│   ├─ Dockerfile
│   └─ pom.xml
├─ doctormicroservice/
│   ├─ src/
│   ├─ Dockerfile
│   └─ pom.xml
├─ patientmicroservice/
│   ├─ src/
│   ├─ Dockerfile
│   └─ pom.xml
├─ usermicroservice/
│   ├─ src/
│   ├─ Dockerfile
│   └─ pom.xml
├─ src/                # Angular app
│   ├─ app/
│   ├─ assets/
│   └─ ...
├─ .github/
│   └─ workflows/
│       └─ ci.yml
├─ render.yaml
├─ DEPLOY_RENDER.md
```

---

## 🧪 Testing

- Run backend tests with Maven: `./mvnw test`
- Run frontend tests with: `npm test`

---

## 👨‍💻 Contributing

Pull requests are welcome.
Please open an issue before submitting major changes.

---

## 📄 License

Specify license here (e.g., MIT, Apache 2.0, etc.)

---

## 🙏 Acknowledgements

Thanks to all contributors and the open-source community!
