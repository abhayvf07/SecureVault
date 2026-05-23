# 🚀 SecureVault — File Storage & Sharing Platform

🔐 A full-stack secure file storage system inspired by Google Drive, built using the MERN stack.
It allows users to upload, manage, and share files securely with authentication, activity tracking, and scalable backend architecture.

---

## 🌐 Live Demo

👉 Frontend: https://your-frontend-link.vercel.app
👉 Backend API: https://your-backend-link.onrender.com
---

## 📸 Preview

### 🏠 Dashboard

Overview of files, folders, and user activity.
<img width="1920" height="923" alt="Dashborad" src="Screenshots/Dashboard.png" />

---

### 🔗 File Sharing

Share files using secure links with optional protection.
<img width="1920" height="923" alt="Share" src="Screenshots/Share.png" />

---

### 📊 Activity Tracking

Track user actions like uploads, deletes, and shares.
<img width="1920" height="923" alt="Home Page" src="Screenshots/Activity.png" />

---

## 🎯 Why This Project Matters

This project demonstrates:

* Secure authentication system (JWT-based)
* Scalable backend design (modular architecture)
* File handling & storage logic
* Real-world features like sharing, tracking, and validation
* Clean frontend integration with API

💡 Built with focus on **backend engineering, security, and scalability**

---

## 📌 Features

### 🔐 Authentication & Security

* JWT-based authentication
* Protected API routes
* Environment variable protection
* Input validation (Zod)

### 📁 File Management

* Upload files with validation
* Folder-based organization
* Download & delete files
* File metadata handling

### 🔗 File Sharing

* Share files via unique links
* Password-protected access
* Expiry-based links
* Download tracking

### 📊 Activity Tracking

* Logs user actions (upload, delete, share, login)
* Backend logging system

### ⚡ Performance & Scalability

* Pagination support
* Optimized database queries
* Modular backend architecture

---

## 🏗 Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS
* Axios

### Backend

* Node.js
* Express.js
* MongoDB (Mongoose)

### Tools & Libraries

* JWT (Authentication)
* Multer (File Upload)
* Zod (Validation)

---

## 📂 Project Structure

```id="struct01"
SecureVault/
│
├── client/                # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── dist/ (ignored)
│
├── server/                # Backend (Node + Express)
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── uploads/ (ignored)
│   └── __tests__/
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash id="clone01"
git clone https://github.com/your-abhayvf07/securevault.git
cd securevault
```

---

### 2️⃣ Setup Backend

```bash id="backend01"
cd server
npm install
```

Create `.env` file:

```id="env01"
PORT=5000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5173
```

Run backend:

```bash id="backend02"
npm run dev
```

---

### 3️⃣ Setup Frontend

```bash id="frontend01"
cd client
npm install
npm run dev
```

---

## 🚀 Deployment

* Frontend: Vercel / Netlify
* Backend: Render / Railway

---

## 🔒 Security Highlights

* File type validation
* Secure authentication flow
* Environment variable protection
* API-level validation using Zod
* Rate limiting (if implemented)

---

## 📊 Future Improvements

* Refresh token authentication system
* Cloud storage (AWS S3 / Cloudinary)
* Drag & drop file system
* Advanced analytics dashboard
* Search & filtering

---

## 🧪 Testing

* Basic API test structure included
* Easily extendable for full test coverag

## 🤝 Contributing

Contributions are welcome! Feel free to fork and submit a pull request.

---

## 📧 Contact

GitHub: https://github.com/abhayvf07

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
