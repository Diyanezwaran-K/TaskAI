# TaskAI 🚀

**Live Demo:** [task-ai-chi.vercel.app](https://task-ai-chi.vercel.app/)

> **Note:** This website's dimensions work perfectly on laptops. If you are using it on a mobile device, please enable "Desktop site" view in your mobile browser for a seamless experience.

TaskAI is a smart, vanilla JavaScript-based task manager that uses AI to analyze, prioritize, and summarize your daily work. 

## ✨ Features
- **AI Task Prioritization:** Automatically classify the priority of tasks and generate a step-by-step breakdown (subtasks) using Anthropic's Claude.
- **Smart Notifications:** Browser push notifications automatically trigger 1 day, 1 hour, and 10 minutes before a task is due.
- **Advanced Filtering & Search:** Filter by Status, Priority, Category, and live search.
- **Dynamic Metrics Dashboard:** Real-time completion rates, open tasks, due soon metrics, and charts.
- **Local Storage:** Zero-backend setup. All data is saved directly in your browser.
- **Authentication Simulation:** Built-in multi-user emulation. 

## 🛠️ Tech Stack
- HTML5
- CSS3 (Vanilla, CSS Grid, Flexbox, Custom Properties)
- JavaScript (Vanilla ES6)
- Anthropic API (Claude 3.5 Haiku)

## 🚀 Getting Started

1. Clone this repository:
```bash
git clone https://github.com/your-username/TaskAI.git
```
2. Open `index.html` in your browser (or use a local server like `http-server` or VS Code Live Server).
3. Create an account on the landing page.
4. Click the **Settings (gear) icon** at the top right of the workspace.
5. Enter your Anthropic API Key to unlock AI features!

## 🌐 Deploying to Vercel

Since TaskAI is a static front-end application, it can be deployed instantly to Vercel.

1. Create a GitHub repository and push this code to it.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Leave the Framework Preset as "Other" and click **Deploy**.
5. Your application will be live in seconds!
