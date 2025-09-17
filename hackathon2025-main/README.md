# hackathon2025
authenticator for fake documents 

# ✨ Smart Certificate Verifier

A modern, secure, and AI-enhanced web application designed to instantly verify the authenticity of academic and professional certificates. This tool provides a seamless experience for authorized personnel to validate documents against an institutional database, leveraging AI for advanced forgery detection and support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with: Gemini](https://img.shields.io/badge/Made%20with-Gemini%20API-8A2BE2.svg)](https://ai.google.dev/)
[![Built with: Tailwind CSS](https://img.shields.io/badge/Built%20with-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)

---

### 🚀 Live Demo

**[View Live Demo](https://your-deployment-link.com)**

### 📸 Screenshot

![Smart Certificate Verifier Screenshot](https://i.imgur.com/example-image.png)
*The verification results page, showing a 'Suspect' certificate with an AI-generated anomaly report.*

---

## 🌟 Key Features

* **Dual Verification Methods:** Upload a certificate file (PDF, JPG, PNG) or enter a Certificate ID directly.
* **AI-Powered Forgery Detection:** Simulates analysis of document properties to generate a "Tamper Score," flagging potential forgeries.
* **Instant Results:** Get clear, actionable verification statuses—`Valid`, `Invalid (Fake)`, or `Suspect`.
* **✨ Gemini AI Anomaly Reports:** For 'Suspect' certificates, users can generate a detailed report from the Gemini API, outlining potential reasons for the flag (e.g., font inconsistencies, signature mismatch).
* **✨ Gemini AI Support Tickets:** A built-in support form allows users to get AI assistance in drafting professional, detailed support tickets from a simple query.
* **Verification History:** Keeps a session-based log of all verification activities for easy reference.
* **Secure & Responsive UI:** A clean, modern interface built with Tailwind CSS that works seamlessly on all devices.
* **SPA Architecture:** A fast single-page application experience built with vanilla JavaScript, without the need for a heavy framework.

---

## 🛠️ Technology Stack

* **Frontend:**
    * HTML5
    * CSS3 / Tailwind CSS
    * Vanilla JavaScript (ES6+)
* **AI Integration:**
    * Google Gemini API for report generation and text enhancement.

---

## ⚙️ How It Works

The application follows a simulated but logically sound verification process:

1.  **Upload & Preprocessing:** A user uploads a certificate file or enters an ID. The system prepares the input for analysis.
2.  **OCR & Data Extraction (Simulated):** In a real-world scenario, Optical Character Recognition (OCR) would extract key fields like Name, Course, and Certificate ID.
3.  **Database Matching (Simulated):** The extracted data is cross-referenced with a secure institutional database. A mismatch results in an "Invalid" status.
4.  **Forgery Detection & Tamper Score:** The system analyzes various markers (simulated) to calculate a weighted "Tamper Score". A high score on a matched certificate results in a "Suspect" status.
5.  **AI Analysis:** If a certificate is "Suspect," a call is made to the **Gemini API** with a prompt containing the certificate's context, requesting an analysis of potential anomalies.
6.  **Results Display:** A comprehensive report is presented to the user with all the relevant details and AI-generated insights.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* A modern web browser.
* A code editor (e.g., VS Code with the "Live Server" extension is recommended for easy local hosting).

### ⚠️ IMPORTANT: API Key Configuration

This project uses the Google Gemini API, which requires a secret API key. **Never expose your API key in the client-side JavaScript code.**

1.  **Obtain API Key:** Get your API key from [Google AI Studio](https://makersuite.google.com/).

2.  **Set up a Backend Proxy:** The only secure way to use an API key is through a backend server that acts as a proxy. Your frontend will call your backend, and your backend will securely add the key and call the Google API.

3.  **Local Configuration (if using a backend):**
    * Create a file named `.env` in your backend's root directory.
    * Add your API key to this file:
        ```
        GEMINI_API_KEY="YOUR_API_KEY_HERE"
        ```
    * Ensure your `.gitignore` file includes `.env` to prevent the key from being committed to Git.
        ```
        # .gitignore
        .env
        ```

### Installation & Running

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/smart-certificate-verifier.git](https://github.com/your-username/smart-certificate-verifier.git)
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd smart-certificate-verifier
    ```
3.  **Open `index.html`:**
    * If you have the "Live Server" extension in VS Code, right-click `index.html` and select "Open with Live Server".
    * Alternatively, you can open the `index.html` file directly in your browser.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact

Your Name - YOGESH KUMAR - strawhatyogii.com

Project Link: [https://github.com/edge2006/hackathon2025](https://github.com/edge2006/hackathon2025)
