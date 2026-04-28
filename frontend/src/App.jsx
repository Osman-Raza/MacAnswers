import { useState } from "react";
import KnowledgeBase from "./pages/KnowledgeBase.jsx";
import IssueTracker from "./pages/IssueTracker.jsx";
import Transit from "./pages/Transit.jsx";
import styles from "./App.module.css";

const TABS = [
  { id: "ask",     label: "Ask Anything",    icon: "✦" },
  { id: "issues",  label: "Campus Issues",   icon: "⬡" },
  { id: "transit", label: "Transit",         icon: "◎" },
];

export default function App() {
  const [tab, setTab] = useState("ask");

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>M</span>
          <span className={styles.wordmark}>MacAnswers</span>
        </div>
        <nav className={styles.nav}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.active : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className={styles.tabIcon}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        {tab === "ask"     && <KnowledgeBase />}
        {tab === "issues"  && <IssueTracker />}
        {tab === "transit" && <Transit />}
      </main>
    </div>
  );
}
