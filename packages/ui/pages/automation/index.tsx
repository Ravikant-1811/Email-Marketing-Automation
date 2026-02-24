import DashboardLayout from "layout/DashboardLayout";
import { useQuery } from "@apollo/client";
import { GET_EMAILS } from "components/email/EmailQueries";
import { useEffect, useMemo, useState } from "react";
import styles from "styles/Automation.module.css";

type StepDraft = {
  emailId: string;
  delayMinutes: number;
};

type AutomationRun = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  lastExecutedAt: string;
  steps: Array<{
    id: string;
    stepOrder: number;
    status: string;
    delayMinutes: number;
    scheduledFor: string;
  }>;
};

const AutomationPage = () => {
  const { data } = useQuery(GET_EMAILS);
  const [leadEmail, setLeadEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [runName, setRunName] = useState("Welcome + Nurture Flow");
  const [steps, setSteps] = useState<StepDraft[]>([
    { emailId: "", delayMinutes: 0 },
  ]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emails = useMemo(() => data?.emails?.nodes || [], [data]);

  const getAuthHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    authorization: localStorage.token ? `Bearer ${localStorage.token}` : "",
  });

  const fetchRuns = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/automation/runs`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const body = await response.json();
    if (response.ok) {
      setRuns(body.runs || []);
      return;
    }

    setMessage(body?.message || "Failed to load automation runs");
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const createRun = async () => {
    setIsSubmitting(true);
    setMessage("");

    try {
      const filteredSteps = steps.filter((step) => step.emailId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/automation/runs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: runName,
          lead: {
            email: leadEmail,
            firstName,
            lastName,
          },
          steps: filteredSteps,
          startImmediately: true,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setMessage(body?.message || "Failed to create automation run");
        return;
      }

      setMessage("Automation run created successfully");
      setLeadEmail("");
      setFirstName("");
      setLastName("");
      setSteps([{ emailId: "", delayMinutes: 0 }]);
      fetchRuns();
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispatchNow = async () => {
    setMessage("");
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/automation/dispatch`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    const body = await response.json();
    if (!response.ok) {
      setMessage(body?.message || "Failed to process pending automation steps");
      return;
    }

    setMessage(
      `Processed ${body.summary?.matched || 0} step(s), sent ${body.summary?.sent || 0}`
    );
    fetchRuns();
  };

  return (
    <DashboardLayout index={0}>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div>
            <p className={styles.kicker}>Email Marketing Automation</p>
            <h1>Build and run complete automated email journeys.</h1>
            <p className={styles.subtext}>
              Capture a lead, enroll them in a sequence, and auto-send follow-ups from your existing email templates.
            </p>
          </div>
          <button className={styles.secondaryButton} onClick={dispatchNow}>
            Process Pending Steps
          </button>
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2>Create Automation Run</h2>
            <label>Run Name</label>
            <input
              value={runName}
              onChange={(event) => setRunName(event.target.value)}
            />
            <label>Lead Email</label>
            <input
              type="email"
              placeholder="lead@company.com"
              value={leadEmail}
              onChange={(event) => setLeadEmail(event.target.value)}
            />
            <div className={styles.row}>
              <div>
                <label>First Name</label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div>
                <label>Last Name</label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>

            <div className={styles.stepsHeader}>
              <h3>Sequence Steps</h3>
              <button
                className={styles.ghostButton}
                onClick={() =>
                  setSteps((current) => [
                    ...current,
                    { emailId: "", delayMinutes: 60 },
                  ])
                }
              >
                + Add Step
              </button>
            </div>

            {steps.map((step, index) => (
              <div className={styles.stepCard} key={index}>
                <span>Step {index + 1}</span>
                <select
                  value={step.emailId}
                  onChange={(event) => {
                    const next = [...steps];
                    next[index].emailId = event.target.value;
                    setSteps(next);
                  }}
                >
                  <option value="">Select email template</option>
                  {emails.map((email) => (
                    <option key={email.id} value={email.id}>
                      {email.name || email.subject || email.id}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={step.delayMinutes}
                  onChange={(event) => {
                    const next = [...steps];
                    next[index].delayMinutes = Number(event.target.value);
                    setSteps(next);
                  }}
                  placeholder="Delay minutes"
                />
              </div>
            ))}

            <button
              className={styles.primaryButton}
              onClick={createRun}
              disabled={isSubmitting || !leadEmail}
            >
              {isSubmitting ? "Creating..." : "Launch Automation"}
            </button>
          </section>

          <section className={styles.panel}>
            <h2>Recent Runs</h2>
            <div className={styles.runsList}>
              {runs.length === 0 && <p>No automation runs yet.</p>}
              {runs.map((run) => (
                <div key={run.id} className={styles.runCard}>
                  <div className={styles.runHeader}>
                    <strong>{run.name}</strong>
                    <span className={styles.badge}>{run.status}</span>
                  </div>
                  <p>{new Date(run.createdAt).toLocaleString()}</p>
                  <p>{run.steps?.length || 0} step(s)</p>
                  <div className={styles.runSteps}>
                    {(run.steps || []).map((step) => (
                      <p key={step.id}>
                        Step {step.stepOrder}: {step.status} ({step.delayMinutes} min)
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {message && <p className={styles.message}>{message}</p>}
      </div>
    </DashboardLayout>
  );
};

export default AutomationPage;
